-- VoteChain BDA module: participation analytics in Hive.
-- Both tables are EXTERNAL: Hive reads the CSV files already in HDFS and never moves them.
-- Every query only reports groups with at least 10 people (small-cell suppression).

CREATE DATABASE IF NOT EXISTS votechain;
USE votechain;

DROP TABLE IF EXISTS participation;
CREATE EXTERNAL TABLE participation (
  voter_ref     STRING,
  election_id   STRING,
  election_date STRING,
  org_type      STRING,
  state         STRING,
  birth_year    INT,
  gender        STRING,
  invited_at    STRING,
  reminded      INT,
  signed_in     INT,
  voted         INT,
  voted_at      STRING
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/votechain/raw/participation'
TBLPROPERTIES ('skip.header.line.count' = '1');

DROP TABLE IF EXISTS elections;
CREATE EXTERNAL TABLE elections (
  election_id     STRING,
  org_type        STRING,
  state           STRING,
  election_date   STRING,
  eligible_voters INT,
  votes_cast      INT,
  num_candidates  INT,
  winner_votes    INT,
  runner_up_votes INT
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/votechain/raw/elections'
TBLPROPERTIES ('skip.header.line.count' = '1');

-- Derived columns used by several queries: age at election time, age group, voting hour and day.
DROP VIEW IF EXISTS participation_v;
CREATE VIEW participation_v AS
SELECT p.*,
       year(election_date) - birth_year AS age,
       CASE WHEN year(election_date) - birth_year <= 25 THEN '18-25'
            WHEN year(election_date) - birth_year <= 35 THEN '26-35'
            WHEN year(election_date) - birth_year <= 50 THEN '36-50'
            WHEN year(election_date) - birth_year <= 65 THEN '51-65'
            ELSE '65+' END AS age_group,
       CASE WHEN voted = 1 THEN hour(voted_at) END AS vote_hour,
       CASE WHEN voted = 1 THEN date_format(voted_at, 'EEEE') END AS vote_day
FROM participation p;

-- Q1. Turnout by age group
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q1_turnout_by_age_group'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT age_group, COUNT(*) AS invited, SUM(voted) AS voted, ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation_v GROUP BY age_group HAVING COUNT(*) >= 10 ORDER BY age_group;

-- Q2. Turnout by gender
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q2_turnout_by_gender'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT gender, COUNT(*) AS invited, SUM(voted) AS voted, ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation GROUP BY gender HAVING COUNT(*) >= 10 ORDER BY turnout_pct DESC;

-- Q3. Turnout by organization type
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q3_turnout_by_org_type'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT org_type, COUNT(DISTINCT election_id) AS elections, COUNT(*) AS invited, SUM(voted) AS voted,
       ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation GROUP BY org_type HAVING COUNT(*) >= 10 ORDER BY turnout_pct DESC;

-- Q4. Turnout by state
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q4_turnout_by_state'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT state, COUNT(*) AS invited, SUM(voted) AS voted, ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation GROUP BY state HAVING COUNT(*) >= 10 ORDER BY turnout_pct DESC;

-- Q5. Turnout by age group within each organization type
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q5_turnout_age_by_org_type'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT org_type, age_group, COUNT(*) AS invited, SUM(voted) AS voted, ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation_v GROUP BY org_type, age_group HAVING COUNT(*) >= 10 ORDER BY org_type, age_group;

-- Q6. When people vote: hour of the day and day of the week
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q6a_votes_by_hour'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT vote_hour, COUNT(*) AS votes
FROM participation_v WHERE voted = 1 GROUP BY vote_hour ORDER BY vote_hour;

INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q6b_votes_by_day'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT vote_day, COUNT(*) AS votes
FROM participation_v WHERE voted = 1 GROUP BY vote_day ORDER BY votes DESC;

-- Q7. Drop-off funnel: invited -> signed in -> voted, overall and per organization type
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q7_funnel_by_org_type'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT org_type, COUNT(*) AS invited, SUM(signed_in) AS signed_in, SUM(voted) AS voted,
       ROUND(100 * SUM(signed_in) / COUNT(*), 2) AS signed_in_pct,
       ROUND(100 * SUM(voted) / COUNT(*), 2) AS voted_pct
FROM participation GROUP BY org_type
UNION ALL
SELECT 'ALL', COUNT(*), SUM(signed_in), SUM(voted),
       ROUND(100 * SUM(signed_in) / COUNT(*), 2), ROUND(100 * SUM(voted) / COUNT(*), 2)
FROM participation;

-- Q7b. Do reminder emails raise turnout?
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q7b_reminder_effect'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT CASE WHEN reminded = 1 THEN 'Reminder sent' ELSE 'No reminder' END AS reminder,
       COUNT(*) AS invited, SUM(voted) AS voted, ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation GROUP BY reminded;

-- Q8. Margin of victory (from election-level results, never joined to voters)
INSERT OVERWRITE LOCAL DIRECTORY '/work/output/hive/q8_margin_by_org_type'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT org_type,
       COUNT(*) AS elections,
       ROUND(AVG(winner_votes - runner_up_votes), 1) AS avg_margin_votes,
       ROUND(AVG(100 * (winner_votes - runner_up_votes) / votes_cast), 2) AS avg_margin_pct,
       ROUND(AVG(100 * winner_votes / votes_cast), 2) AS avg_winner_share_pct,
       ROUND(100 * SUM(CASE WHEN 100 * (winner_votes - runner_up_votes) / votes_cast < 5 THEN 1 ELSE 0 END) / COUNT(*), 2) AS close_contest_pct,
       ROUND(100 * SUM(CASE WHEN 100 * winner_votes / votes_cast > 60 THEN 1 ELSE 0 END) / COUNT(*), 2) AS landslide_pct
FROM elections WHERE votes_cast > 0
GROUP BY org_type
UNION ALL
SELECT 'ALL', COUNT(*),
       ROUND(AVG(winner_votes - runner_up_votes), 1),
       ROUND(AVG(100 * (winner_votes - runner_up_votes) / votes_cast), 2),
       ROUND(AVG(100 * winner_votes / votes_cast), 2),
       ROUND(100 * SUM(CASE WHEN 100 * (winner_votes - runner_up_votes) / votes_cast < 5 THEN 1 ELSE 0 END) / COUNT(*), 2),
       ROUND(100 * SUM(CASE WHEN 100 * winner_votes / votes_cast > 60 THEN 1 ELSE 0 END) / COUNT(*), 2)
FROM elections WHERE votes_cast > 0;
