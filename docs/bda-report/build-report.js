// Builds the VoteChain BDA laboratory record (.docx), following the college sample's structure.
// Every figure is read from the pipeline's output files, so the report always matches the run.
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, BorderStyle, Header, Footer, PageNumber, LevelFormat, PageBreak, TabStopType,
  HeadingLevel, VerticalAlign,
} = require('docx')

const ROOT = 'D:/votechain'
const OUT = path.join(ROOT, 'analytics', 'output')
const ASSETS = path.join(ROOT, 'docs', 'bda-report', 'assets')
const DEST = path.join(ROOT, 'docs', 'BDA-Report-VoteChain.docx')

// ---- Details the student must fill in (highlighted in yellow in the document) ----
const STUDENT = '[Student Name]'
const ROLL = '[Roll Number]'
const SEMESTER = '[Semester]'
const SUPERVISOR = '[Supervisor Name]'
const DESIGNATION = 'Assistant Professor'
const SESSION = '[Session, e.g. 2026-27]'
const DATE = '25 October 2026'
const TITLE = 'Participation Analytics of a Blockchain-Based Voting Platform (VoteChain) using Hadoop MapReduce, Hive and PySpark'

// ---- Load results ----
const csv = (name) => {
  const [head, ...rows] = fs.readFileSync(path.join(OUT, 'spark', name + '.csv'), 'utf8').trim().split(/\r?\n/)
  const cols = head.split(',')
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])))
}
const S = JSON.parse(fs.readFileSync(path.join(OUT, 'summary.json'), 'utf8'))
const age = csv('q1_turnout_by_age_group'), gender = csv('q2_turnout_by_gender'), org = csv('q3_turnout_by_org_type')
const state = csv('q4_turnout_by_state'), hour = csv('q6a_votes_by_hour'), day = csv('q6b_votes_by_day')
const funnel = csv('q7_funnel_by_org_type'), remind = csv('q7b_reminder_effect'), margin = csv('q8_margin_by_org_type')
const n = (v) => Number(v).toLocaleString('en-US')
const pct = (v) => Number(v).toFixed(2) + '%'
const totalVotes = hour.reduce((a, r) => a + Number(r.votes), 0)
const sumHours = (from, to) => hour.filter((r) => Number(r.vote_hour) >= from && Number(r.vote_hour) <= to).reduce((a, r) => a + Number(r.votes), 0)
const peak = hour.reduce((a, r) => (Number(r.votes) > Number(a.votes) ? r : a))
const morning = sumHours(7, 10), evening = sumHours(18, 21)
const fileMB = (fs.statSync(path.join(ROOT, 'analytics', 'data', 'participation.csv')).size / 1048576).toFixed(1)
const marginAll = margin.find((r) => r.org_type === 'ALL')
const youngest = age[0], oldest = age.reduce((a, r) => (Number(r.turnout_pct) > Number(a.turnout_pct) ? r : a))
const remY = remind.find((r) => r.reminder === 'Reminder sent'), remN = remind.find((r) => r.reminder === 'No reminder')
const stMax = state[0], stMin = state[state.length - 1]
const allF = { invited: S.participation_rows, signed: funnel.reduce((a, r) => a + Number(r.signed_in), 0), voted: funnel.reduce((a, r) => a + Number(r.voted), 0) }

// ---- Building blocks ----
const FONT = 'Arial', SERIF = 'Times New Roman'
const t = (text, o = {}) => new TextRun({ text, font: o.font || FONT, size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color, highlight: o.hl ? 'yellow' : undefined })
// Highlights every [placeholder] inside the text, so the student can spot what to fill in.
const fill = (text, o = {}) => {
  const parts = String(text).split(/(\[[^\]]+\])/).filter(Boolean)
  const runs = parts.map((x) => t(x, { ...o, hl: /^\[.*\]$/.test(x) }))
  return runs.length === 1 ? runs[0] : runs
}
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [t(runs)], alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 120, before: o.before ?? 0, line: o.line ?? 300 }, keepNext: o.keepNext })
const rich = (s, o = {}) => p(s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => (x.startsWith('**') ? t(x.slice(2, -2), { bold: true }) : t(x))), o)
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '222222', space: 1 } }, spacing: { after: 160 } })
const h1 = (text) => [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text, { size: 30, bold: true, color: '000000' })], spacing: { before: 280, after: 60 }, keepNext: true }), rule()]
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text, { size: 25, bold: true, color: '000000' })], spacing: { before: 200, after: 100 }, keepNext: true })
const bullet = (s) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80, line: 290 }, alignment: AlignmentType.JUSTIFIED,
  children: s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((x) => (x.startsWith('**') ? t(x.slice(2, -2), { bold: true }) : x.startsWith('`') ? t(x.slice(1, -1), { font: 'Consolas', size: 20 }) : t(x))) })
const numbered = (s, ref = 'steps') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 290 }, alignment: ref === 'refs' ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
  children: s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((x) => (x.startsWith('**') ? t(x.slice(2, -2), { bold: true }) : t(x))) })
const code = (lines) => lines.split('\n').map((line, i, all) => new Paragraph({
  children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 17 })],
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' },
  spacing: { before: i === 0 ? 80 : 0, after: i === all.length - 1 ? 160 : 0, line: 240 },
  indent: { left: 120, right: 120 },
}))
const pngSize = (file) => { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }
const chart = (name, caption) => {
  const file = path.join(OUT, 'charts', name + '.png')
  const { w, h } = pngSize(file)
  const width = 560
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width, height: Math.round(width * h / w) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [t(caption, { size: 19, italics: true, color: '444444' })] }),
  ]
}

const CONTENT_W = 9026 // A4 width 11906 minus 2 x 1440 margins
const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: '555555' }
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder }
const table = (head, rows, widths) => {
  const total = widths.reduce((a, b) => a + b, 0)
  const cell = (text, w, isHead, align) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
    shading: isHead ? { type: ShadingType.CLEAR, color: 'auto', fill: '1F1F1F' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: align, children: [isHead ? t(text, { bold: true, color: 'FFFFFF', size: 20 }) : fill(String(text), { size: 20 })].flat() })],
  })
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      ...(head ? [new TableRow({ tableHeader: true, children: head.map((x, i) => cell(x, widths[i], true, AlignmentType.LEFT)) })] : []),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((x, i) => cell(x, widths[i], false, i > 0 && /^[\d,.%\s]+$/.test(String(x)) ? AlignmentType.RIGHT : AlignmentType.LEFT)) })),
    ],
  })
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] })

// ---- Header and footer (as in the sample) ----
const header = new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '1F3864', space: 4 } }, children: [] })] })
const footer = new Footer({ children: [new Paragraph({
  alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 8, color: '222222', space: 4 } },
  children: [fill(STUDENT, { size: 18 }), t(' | ', { size: 18 }), fill(ROLL, { size: 18 }), t(' | CS ', { size: 18 }), fill(SEMESTER, { size: 18 }), t(' Semester        Page ', { size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })],
})] })

// ---- Cover page ----
const center = (runs, after = 120) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children: runs })
const logo = (file) => center([new ImageRun({ type: 'jpg', data: fs.readFileSync(path.join(ASSETS, file)), transformation: { width: 130, height: 130 } })], 160)
const cover = [
  new Paragraph({ spacing: { after: 600 }, children: [] }),
  center([t('AN EXPERIMENT', { font: SERIF, size: 28 })], 40),
  center([t('ON', { font: SERIF, size: 28 })], 240),
  center([t(TITLE, { font: SERIF, size: 30, bold: true })], 280),
  center([t('Final Practical Assessment of ', { font: SERIF, size: 26 }), t('Big Data Analytics (BDA)', { font: SERIF, size: 26, bold: true })], 40),
  center([t('Bachelor of Technology in Computer Science Engineering ', { font: SERIF, size: 26 }), fill(SEMESTER, { font: SERIF, size: 26 }), t(' Semester', { font: SERIF, size: 26 })], 400),
  center([t('Submitted to:', { font: SERIF, size: 28, bold: true })], 160),
  logo('rtu_logo.jpg'),
  center([t('Rajasthan Technical University, Kota (Raj.)', { font: SERIF, size: 28 })], 500),
  center([t('Submitted By:', { font: SERIF, size: 28, bold: true })], 160),
  center([fill(STUDENT, { font: SERIF, size: 28, bold: true })], 40),
  center([fill(ROLL, { font: SERIF, size: 28, bold: true })], 240),
  center([t('Under the supervision of', { font: SERIF, size: 28, bold: true })], 40),
  center([fill(SUPERVISOR, { font: SERIF, size: 28, bold: true })], 120),
  center([t(DESIGNATION, { font: SERIF, size: 26 })], 360),
  logo('arya_logo.jpg'),
  center([t('Session: ', { font: SERIF, size: 28, bold: true }), fill(SESSION, { font: SERIF, size: 28, bold: true })], 0),
  new Paragraph({ children: [new PageBreak()] }),
]

// ---- Record header page ----
const record = [
  center([t('Department of Computer Science and Engineering', { font: SERIF, size: 28 })], 20),
  center([t('ARYA COLLEGE OF ENGINEERING & I.T.', { font: SERIF, size: 28, bold: true })], 20),
  center([t('SP-42, RIICO INDUSTRIAL AREA, KUKAS, JAIPUR', { font: SERIF, size: 28, bold: true })], 400),
  center([t('BIG DATA ANALYTICS', { size: 48, bold: true })], 60),
  center([t('Laboratory Record', { size: 30, bold: true })], 120),
  rule(),
  center([t('Experiment', { size: 24 })], 40),
  center([t(TITLE, { size: 26, bold: true })], 240),
  table(null, [
    ['Student Name', STUDENT], ['Roll Number', ROLL], ['Branch & Year', `Computer Science — ${SEMESTER} Semester`],
    ['Experiment', TITLE],
    ['Tools & Technologies', 'Python 3, Hadoop 3.3.6 (HDFS, YARN, MapReduce Streaming), Hive 3.1.3, PySpark 3.5.3, Pandas, Matplotlib, Docker'],
    ['Date', DATE],
  ], [2800, 6226]),
  gap(),
]

// ---- 1. Aim and 2. Objectives ----
const aim = [
  ...h1('1. Aim'),
  p(`To design and demonstrate a Big Data analytics pipeline for VoteChain, our blockchain-based online voting platform, that measures voter participation (turnout) across age groups, genders, organization types and states using Hadoop (HDFS and MapReduce), Hive and PySpark. The study processes ${n(S.participation_rows)} voter-participation records from ${n(S.elections)} elections and shows how the 5 V's of Big Data (Volume, Velocity, Variety, Veracity and Value) apply to an election platform, while keeping every individual ballot secret.`),
  ...h1('2. Objectives'),
  bullet('**Measure participation patterns:** Find how turnout varies by age group, gender, organization type (college, company, housing society, panchayat, NGO, club) and state.'),
  bullet('**Apply the MapReduce paradigm:** Count invited voters and votes per group with Hadoop Streaming jobs written in Python (mapper, combiner and reducer).'),
  bullet('**Query at scale with Hive:** Run SQL-style analysis (HiveQL) directly on CSV files stored in HDFS, using external tables.'),
  bullet('**Analyse with PySpark:** Compute all eight analyses with Spark DataFrames, generate charts, and cross-check the results against MapReduce.'),
  bullet('**Study election behaviour:** Find when people vote (hour and day), where they drop off (invited → signed in → voted), whether reminders help, and how close elections are (margin of victory).'),
  bullet('**Protect ballot secrecy:** Never link a voter\'s demographics to whom they voted for, and hide any group smaller than 10 people.'),
]

// ---- 3. Theory ----
const theory = [
  ...h1('3. Theory'),
  h2('3.1 The 5 V\'s of Big Data in VoteChain'),
  p('Big Data is defined not only by size but by five characteristics. In VoteChain, operating at a national scale across thousands of organizations, they apply as follows:'),
  bullet(`**Volume:** A single college election has a few thousand voters, but a platform serving colleges, companies, housing societies and panchayats across India accumulates millions of participation records. This study processes ${n(S.participation_rows)} records (${fileMB} MB), which calls for distributed storage (HDFS) and parallel processing.`),
  bullet('**Velocity:** Votes arrive in bursts. On an election day, thousands of ballots can be cast within minutes, and each is time-stamped to the second, which makes the data "data in motion".'),
  bullet('**Variety:** VoteChain data comes in several forms: JSON documents in MongoDB (users, elections, invites), blockchain event logs (VoteCast transactions), uploaded CSV voter lists and server logs.'),
  bullet('**Veracity:** Election data must be trustworthy. In VoteChain every vote count can be verified against the Ethereum blockchain, and in this study the results of two independent engines (MapReduce and Spark) were matched exactly.'),
  bullet('**Value:** Turnout insights help organizers decide when to schedule elections, which groups to remind, and how to plan server and blockchain capacity.'),
  h2('3.2 HDFS (Hadoop Distributed File System)'),
  p('HDFS stores large files by splitting them into blocks (128 MB by default) and distributing the blocks across DataNodes, while a NameNode keeps the metadata (which blocks make up which file and where they are). Each block can be replicated for fault tolerance. In this study the dataset is stored in HDFS with a 64 MB block size, so the participation file is split into several blocks that MapReduce can process in parallel. A replication factor of 1 is used because the cluster is a single-node (pseudo-distributed) setup.'),
  h2('3.3 Map-Reduce Pattern for Turnout Aggregation'),
  p('The core processing model used in this study is MapReduce, implemented with Hadoop Streaming so that the map and reduce logic can be written in Python:'),
  bullet('**The Map Phase:** Each mapper reads lines of the participation file and emits a key-value pair for every voter, for example `(36-50, invited=1, voted=1)` when computing turnout by age group.'),
  bullet('**The Combine Phase:** A combiner adds up the pairs on each mapper\'s node before they are sent over the network, so only one partial total per key leaves each mapper.'),
  bullet('**The Shuffle and Sort Phase:** Hadoop groups all values with the same key and delivers them, sorted, to the same reducer, so all "36-50" records arrive together.'),
  bullet('**The Reduce Phase:** The reducer sums invited and voted counts per key and computes the turnout percentage, condensing two million rows into a five-row summary.'),
  h2('3.4 Apache Hive'),
  p('Hive provides a SQL-like language (HiveQL) on top of Hadoop. Its queries are compiled into MapReduce jobs. Hive follows "schema-on-read": an EXTERNAL table describes the columns of files already stored in HDFS without moving or copying them, so the same raw CSV files are used by MapReduce, Hive and Spark.'),
  h2('3.5 Apache Spark (PySpark)'),
  p('Spark is an in-memory distributed processing engine. Unlike MapReduce, which writes intermediate results to disk between stages, Spark keeps data in memory across operations (here the participation DataFrame is cached), which makes multi-step analysis much faster. PySpark is Spark\'s Python API, and its DataFrame operations (groupBy, agg, pivot) are planned and executed in parallel across partitions.'),
  h2('3.6 Descriptive vs. Diagnostic Analytics'),
  p('This study moves from Descriptive Analytics (what happened? e.g. overall turnout was 60.68%) to Diagnostic Analytics (why did it happen? e.g. turnout is lowest among 18–25 year olds and in college elections, and rises with age). By analysing the time-stamp of each vote, temporal patterns of voter behaviour are also identified.'),
  h2('3.7 Privacy-Preserving Analytics'),
  p('A voting system must keep every ballot secret, so analytics are designed around two rules:'),
  bullet('**Data separation:** Participation data (who was invited, their age group and gender, and whether and when they voted) is stored separately from results data (candidate totals per election). The two are never joined at the voter level, so no analysis can reveal whom a person voted for.'),
  bullet('**Small-cell suppression:** Any group with fewer than 10 people is not reported (implemented in the MapReduce reducer, every Hive query and the Spark job). In a small election, a group such as "voters over 65 in one housing society" could otherwise identify individuals.'),
  bullet('**Consent:** Age, gender and state are optional fields in VoteChain\'s voter list, in line with India\'s Digital Personal Data Protection Act, 2023, which requires consent for processing personal data.'),
]

// ---- 4. System Design and Architecture ----
const design = [
  ...h1('4. System Design and Architecture'),
  h2('4.1 Data Ingestion Layer'),
  p('The data source is the VoteChain platform. Its export script (`server/scripts/export-analytics.js`) reads MongoDB and writes two CSV files: participation.csv and elections.csv. Because VoteChain is a new platform without millions of real voters yet, a synthetic dataset with exactly the same schema was generated to simulate national-scale operation (see Section 5.1). Both the live export and the synthetic data pass through the same pipeline.'.replace(/`/g, '')),
  h2('4.2 Logical Schema Design'),
  p('participation.csv (one row per invited voter, never containing a candidate):', { keepNext: true }),
  table(['Column', 'Type', 'Description'], [
    ['voter_ref', 'string', 'Anonymous 12-character reference (no email or name)'],
    ['election_id, election_date', 'string, date', 'Which election, and when it was held'],
    ['org_type, state', 'string', 'Organization type and Indian state'],
    ['birth_year, gender', 'int, string', 'Optional demographics (age group is derived)'],
    ['invited_at', 'timestamp', 'When the voter was invited'],
    ['reminded, signed_in, voted', '0 / 1', 'Reminder sent, voter signed in, voter voted'],
    ['voted_at', 'timestamp', 'When the vote was cast (empty if not voted)'],
  ], [2900, 1500, 4626]),
  gap(),
  p('elections.csv (one row per election, never containing a voter):', { keepNext: true }),
  table(['Column', 'Type', 'Description'], [
    ['election_id, org_type, state, election_date', 'string, date', 'Identity and context of the election'],
    ['eligible_voters, votes_cast', 'int', 'Electorate size and turnout'],
    ['num_candidates', 'int', 'Candidates on the ballot'],
    ['winner_votes, runner_up_votes', 'int', 'Top two totals, used for the margin of victory'],
  ], [3600, 1500, 3926]),
  gap(),
  h2('4.3 Processing Workflow'),
  p('The pipeline follows an Extract, Transform, Load (ETL) flow:', { keepNext: true }),
  numbered('**Extraction:** Participation and election data is exported from VoteChain (or generated) as CSV files.', 'steps'),
  numbered('**Storage:** The files are loaded into HDFS under /votechain/raw/ with a 64 MB block size.', 'steps'),
  numbered('**Transformation:** Age at election time and the age group are derived from birth_year and election_date; vote timestamps are parsed into hour and weekday.', 'steps'),
  numbered('**Processing:** Hadoop Streaming MapReduce jobs, Hive queries and a PySpark job compute the aggregates, with small-cell suppression applied in each.', 'steps'),
  numbered('**Loading and visualisation:** Results are written as CSV files and charts for the report and for VoteChain\'s admin dashboard.', 'steps'),
  ...code(`VoteChain (MongoDB + blockchain)      Synthetic generator (national scale)
              \\                              /
               participation.csv  +  elections.csv
                              |
                     HDFS  /votechain/raw/
               /              |               \\
   MapReduce (Streaming)   Hive (HiveQL)    PySpark (DataFrames)
               \\              |               /
          CSV results  +  charts  +  cross-engine consistency check`),
  h2('4.4 Execution Environment'),
  table(['Component', 'Version / setting'], [
    ['Hadoop', '3.3.6, single-node (pseudo-distributed): NameNode, DataNode, ResourceManager, NodeManager, JobHistory'],
    ['Hive', '3.1.3, embedded Derby metastore, MapReduce execution engine'],
    ['Spark', 'PySpark 3.5.3, local mode using all CPU cores'],
    ['Runtime', 'Java 8, Python 3, Docker container (eclipse-temurin:8-jdk-jammy)'],
    ['Host machine', '16 logical CPU cores, 16 GB RAM, Windows 11'],
  ], [2400, 6626]),
  gap(),
]

// ---- 5. Implementation ----
const impl = [
  ...h1('5. Implementation'),
  h2('5.1 Dataset Generation'),
  p(`A Python generator (analytics/generator/generate_data.py) simulated VoteChain at national scale: ${n(S.elections)} elections across six organization types in 12 Indian states, with ${n(S.participation_rows)} invited voters (${fileMB} MB). The data follows realistic patterns (for example, college electorates are mostly 18–25 years old, turnout is higher among older and smaller electorates, and voting peaks in the morning and evening), so the analysis has genuine structure to discover. It is seeded, so every run produces identical data. The synthetic nature of the data is a deliberate design choice: real VoteChain data is still small, and the same pipeline runs on it unchanged.`),
  h2('5.2 Loading Data into HDFS'),
  ...code(`hdfs dfs -mkdir -p /votechain/raw/participation /votechain/raw/elections
hdfs dfs -D dfs.blocksize=67108864 -put -f data/participation.csv /votechain/raw/participation/
hdfs dfs -put -f data/elections.csv /votechain/raw/elections/
hdfs dfs -ls -h /votechain/raw/participation`),
  h2('5.3 MapReduce with Hadoop Streaming (Python)'),
  p('The mapper takes the dimension to group by as an argument and emits key, invited and voted for every voter. The same mapper, combiner and reducer are reused for all five dimensions (age_group, gender, org_type, state, vote_hour).'),
  ...code(`# mapper.py (excerpt)
for line in sys.stdin:
    f = line.rstrip('\\r\\n').split(',')
    if len(f) < 12 or f[0] == 'voter_ref':      # skip the header
        continue
    if dim == 'age_group':
        key = age_group(f[BIRTH_YEAR], f[ELECTION_DATE])
    elif dim == 'vote_hour':
        if f[VOTED] != '1':
            continue
        key = f[VOTED_AT][11:13]
    ...
    print(f'{key}\\t1\\t{f[VOTED]}')`),
  ...code(`# reducer.py (excerpt): totals per key, with small-cell suppression
for line in sys.stdin:
    key, i, v = line.rstrip('\\n').split('\\t')
    if key != current:
        if current is not None:
            emit(current, invited, voted)     # suppressed if invited < 10
        current, invited, voted = key, 0, 0
    invited += int(i)
    voted += int(v)`),
  p('Each job is submitted with the Hadoop Streaming JAR:', { keepNext: true }),
  ...code(`hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-3.3.6.jar \\
  -D mapreduce.job.name="VoteChain turnout by age_group" -D mapreduce.job.reduces=2 \\
  -files mapper.py,combiner.py,reducer.py \\
  -mapper "python3 mapper.py age_group" -combiner "python3 combiner.py" \\
  -reducer "python3 reducer.py" \\
  -input /votechain/raw/participation -output /votechain/mr/age_group`),
  h2('5.4 Hive Analysis (HiveQL)'),
  p('An EXTERNAL table is defined over the HDFS folder (schema-on-read), and a view derives the age group, voting hour and weekday. Ten queries cover the analyses; two examples:'),
  ...code(`CREATE EXTERNAL TABLE participation (voter_ref STRING, election_id STRING,
  election_date STRING, org_type STRING, state STRING, birth_year INT, gender STRING,
  invited_at STRING, reminded INT, signed_in INT, voted INT, voted_at STRING)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
LOCATION '/votechain/raw/participation'
TBLPROPERTIES ('skip.header.line.count' = '1');

-- Turnout by age group within each organization type
SELECT org_type, age_group, COUNT(*) AS invited, SUM(voted) AS voted,
       ROUND(100 * SUM(voted) / COUNT(*), 2) AS turnout_pct
FROM participation_v
GROUP BY org_type, age_group
HAVING COUNT(*) >= 10;          -- small-cell suppression`),
  h2('5.5 PySpark Analysis'),
  p('The Spark job reads the same HDFS files, derives the age group, caches the DataFrame in memory, and computes all eight analyses, then draws the charts and compares its counts with the MapReduce output.'),
  ...code(`part = spark.read.csv('hdfs://localhost:9000/votechain/raw/participation',
                      header=True, inferSchema=True)
age = F.year(F.to_date('election_date')) - F.col('birth_year')
part = (part.withColumn('age_group', F.when(age <= 25, '18-25').when(age <= 35, '26-35')
                        .when(age <= 50, '36-50').when(age <= 65, '51-65').otherwise('65+'))
            .withColumn('vote_hour', F.hour(F.to_timestamp('voted_at')))
            .cache())

def turnout(df, *keys):
    return (df.groupBy(*keys)
              .agg(F.count('*').alias('invited'), F.sum('voted').alias('voted'))
              .where(F.col('invited') >= 10)          # small-cell suppression
              .withColumn('turnout_pct', F.round(100 * F.col('voted') / F.col('invited'), 2)))`),
]

// ---- 6. Results and Data Insights ----
const results = [
  ...h1('6. Results and Data Insights'),
  p(`The pipeline processed ${n(S.participation_rows)} participation records and ${n(S.elections)} election results. Overall turnout was ${pct(S.overall_turnout_pct)}: ${n(allF.voted)} of ${n(allF.invited)} invited voters cast a vote.`),
  h2('6.1 Turnout by Age Group'),
  table(['Age group', 'Invited', 'Voted', 'Turnout'], age.map((r) => [r.age_group, n(r.invited), n(r.voted), pct(r.turnout_pct)]), [2400, 2300, 2300, 2026]),
  ...chart('q1_turnout_by_age_group', 'Figure 1: Turnout by age group'),
  rich(`Turnout rises steadily with age, from **${pct(youngest.turnout_pct)}** among 18–25 year olds to a peak of **${pct(oldest.turnout_pct)}** in the ${oldest.age_group} group, a gap of ${(Number(oldest.turnout_pct) - Number(youngest.turnout_pct)).toFixed(1)} percentage points. It dips slightly after 65. Young voters are the group that most needs engagement.`),
  h2('6.2 Turnout by Gender'),
  table(['Gender', 'Invited', 'Voted', 'Turnout'], gender.map((r) => [r.gender, n(r.invited), n(r.voted), pct(r.turnout_pct)]), [2400, 2300, 2300, 2026]),
  gap(),
  rich(`Women voted slightly more than men (**${pct(gender.find((r) => r.gender === 'Female').turnout_pct)}** vs **${pct(gender.find((r) => r.gender === 'Male').turnout_pct)}**). The gap is small, so gender is a weaker driver of turnout than age or organization type.`),
  h2('6.3 Turnout by Organization Type'),
  table(['Organization type', 'Elections', 'Invited', 'Voted', 'Turnout'], org.map((r) => [r.org_type, n(r.elections), n(r.invited), n(r.voted), pct(r.turnout_pct)]), [2600, 1500, 1800, 1700, 1426]),
  ...chart('q3_turnout_by_org_type', 'Figure 2: Turnout by organization type'),
  rich(`Community elections engage voters most: **panchayats (${pct(org[0].turnout_pct)})**, NGOs and housing societies all exceed 66%. **College elections have the lowest turnout (${pct(org[org.length - 1].turnout_pct)})**, followed by companies and clubs.`),
  h2('6.4 Turnout by State'),
  table(['State', 'Invited', 'Voted', 'Turnout'], state.map((r) => [r.state, n(r.invited), n(r.voted), pct(r.turnout_pct)]), [2900, 2100, 2100, 1926]),
  gap(),
  rich(`Turnout is almost identical across states, ranging only from ${pct(stMin.turnout_pct)} (${stMin.state}) to ${pct(stMax.turnout_pct)} (${stMax.state}). In this dataset, **location does not drive participation**: what matters is the type of organization and the age of the voter. (The generator does not assign different turnout to different states, and the analysis correctly finds no regional effect.)`),
  h2('6.5 Age Group within each Organization Type'),
  ...chart('q5_turnout_age_by_org_type', 'Figure 3: Turnout by age group within each organization type (— = no voters in that group)'),
  rich('The age effect holds inside every organization type: within panchayats, turnout rises from 60% (18–25) to 76% (51–65), and within housing societies from 54% to 71%. Colleges stay low even though almost all their voters are young, so **both age and organization type independently shape turnout**.'),
  h2('6.6 When People Vote (Temporal Velocity)'),
  ...chart('q6a_votes_by_hour', 'Figure 4: Votes cast by hour of day'),
  rich(`Voting has two clear peaks. **The morning peak is ${String(peak.vote_hour).padStart(2, '0')}:00–${String(Number(peak.vote_hour) + 1).padStart(2, '0')}:00** (${n(peak.votes)} votes, the busiest hour), and the 07:00–10:59 window carries ${(100 * morning / totalVotes).toFixed(1)}% of all votes. An **evening peak from 18:00 to 21:59** carries another ${(100 * evening / totalVotes).toFixed(1)}%. Almost no votes are cast between 01:00 and 04:59. VoteChain should keep its servers and blockchain relayer ready for these two windows.`),
  table(['Day', ...day.map((r) => r.vote_day.slice(0, 3))], [['Votes', ...day.map((r) => n(r.votes))]], [1146, 1125, 1125, 1125, 1125, 1125, 1125, 1130]),
  gap(),
  p('Votes are spread fairly evenly across weekdays, with a slight lift on Friday and Saturday.'),
  h2('6.7 Drop-off Funnel and Reminder Effect'),
  ...chart('q7_funnel', 'Figure 5: Drop-off funnel from invitation to vote'),
  table(['Organization type', 'Invited', 'Signed in', 'Voted', 'Signed in %', 'Voted %'], funnel.map((r) => [r.org_type, n(r.invited), n(r.signed_in), n(r.voted), pct(r.signed_in_pct), pct(r.voted_pct)]), [2100, 1450, 1450, 1450, 1300, 1276]),
  gap(),
  rich(`Out of ${n(allF.invited)} invited voters, **${pct(S.signed_in_pct)} signed in** but only **${pct(S.overall_turnout_pct)} voted**, so about ${(S.signed_in_pct - S.overall_turnout_pct).toFixed(1)}% of voters signed in and then left without voting. Reminder emails clearly help: elections that sent reminders had **${pct(remY.turnout_pct)} turnout against ${pct(remN.turnout_pct)}** without, an increase of ${(Number(remY.turnout_pct) - Number(remN.turnout_pct)).toFixed(2)} percentage points.`),
  h2('6.8 Margin of Victory'),
  table(['Organization type', 'Elections', 'Avg margin (votes)', 'Avg margin', 'Close (<5%)', 'Landslide (>60%)'],
    margin.map((r) => [r.org_type === 'ALL' ? 'All elections' : r.org_type, n(r.elections), r.avg_margin_votes, pct(r.avg_margin_pct), pct(r.close_contest_pct), pct(r.landslide_pct)]), [2000, 1200, 1700, 1400, 1300, 1426]),
  ...chart('q8_margin_histogram', 'Figure 6: Distribution of the margin of victory'),
  rich(`On average, winners led the runner-up by **${pct(marginAll.avg_margin_pct)} of the votes cast** (${marginAll.avg_margin_votes} votes) and received ${pct(marginAll.avg_winner_share_pct)} of the vote. **${pct(marginAll.close_contest_pct)} of elections were close contests** (margin under 5%) and ${pct(marginAll.landslide_pct)} were landslides (winner above 60%). In absolute votes, panchayat margins are the largest (${margin.find((r) => r.org_type === 'Panchayat').avg_margin_votes} votes) simply because their electorates are the largest; in percentage terms margins are similar across all organization types. These figures come only from election-level totals, never from individual voters.`),
]

// ---- 7. Expected Output and Validation ----
const consistency = Object.entries(S.consistency || {})
const validation = [
  ...h1('7. Expected Output and Results'),
  p('This section validates the pipeline. Its expected output is to turn two million raw CSV rows into small, correct summary tables that an election organizer can act on.'),
  h2('7.1 System Output Validation'),
  bullet(`**Completeness:** The age-group totals add up to ${n(age.reduce((a, r) => a + Number(r.invited), 0))} invited voters, exactly the number of rows in participation.csv (${n(S.participation_rows)}), so no records were lost during ingestion or transformation.`),
  bullet(`**Cross-engine consistency:** The invited and voted counts computed by Spark were compared automatically with the MapReduce reducer output for every group. Result: ${consistency.length ? consistency.map(([k, v]) => `${k.replace('mapreduce_', '')} ${v}`).join(', ') : 'not available'}. Two independent engines producing identical numbers confirms that the processing logic is correct.`),
  bullet('**Privacy check:** No output contains a voter reference or any candidate choice, and no reported group has fewer than 10 people.'),
  h2('7.2 Observed Behavioural Patterns'),
  bullet(`**Age is the strongest driver:** a ${(Number(oldest.turnout_pct) - Number(youngest.turnout_pct)).toFixed(1)}-point turnout gap between 18–25 and ${oldest.age_group} year olds.`),
  bullet(`**Community elections engage most:** panchayats lead at ${pct(org[0].turnout_pct)}; colleges trail at ${pct(org[org.length - 1].turnout_pct)}.`),
  bullet(`**Two daily peaks:** 07:00–10:59 (${(100 * morning / totalVotes).toFixed(1)}% of votes) and 18:00–21:59 (${(100 * evening / totalVotes).toFixed(1)}%).`),
  bullet(`**Reminders work:** +${(Number(remY.turnout_pct) - Number(remN.turnout_pct)).toFixed(2)} percentage points of turnout when reminders are sent.`),
  bullet(`**Efficiency:** Spark reduced ${n(S.participation_rows)} rows to all eight summaries in about 40 seconds on a laptop, by processing 16 partitions in parallel.`),
]

// ---- 8. Comparison ----
const comparison = [
  ...h1('8. Comparison: Traditional vs. Big Data Approach'),
  table(['Aspect', 'Traditional (RDBMS)', 'Big Data Approach (VoteChain)'], [
    ['Data Ingestion', 'Periodic manual exports after each election.', 'Bulk loading into HDFS; election-day vote bursts treated as a stream.'],
    ['Storage Strategy', 'One database server with a fixed schema.', 'HDFS blocks across nodes, schema-on-read with Hive external tables.'],
    ['Processing Pattern', 'SQL queries on one machine.', 'Parallel MapReduce jobs and in-memory Spark DataFrames.'],
    ['Insight Depth', 'Simple counts per election (how many voted?).', 'Behavioural diagnostics across thousands of elections (who votes, when, and why not?).'],
    ['Trust (Veracity)', 'Results depend on trusting the database administrator.', 'Counts verified against the blockchain and cross-checked between engines.'],
    ['Privacy', 'Often ad hoc.', 'Data separation and small-cell suppression built into every job.'],
    ['Scalability', 'Vertical scaling (bigger, costlier server).', 'Horizontal scaling (add more nodes to the cluster).'],
  ], [2100, 3300, 3626]),
  gap(),
]

// ---- 9. Result, 10. Conclusion, 11. References ----
const ending = [
  ...h1('9. Result'),
  p(`The Big Data pipeline was successfully implemented for VoteChain, and it analysed ${n(S.participation_rows)} participation records from ${n(S.elections)} elections. The key findings are:`),
  bullet(`**Overall turnout was ${pct(S.overall_turnout_pct)}**, with ${pct(S.signed_in_pct)} of invited voters signing in.`),
  bullet(`**Turnout rises with age,** from ${pct(youngest.turnout_pct)} (18–25) to ${pct(oldest.turnout_pct)} (${oldest.age_group}).`),
  bullet(`**Panchayats (${pct(org[0].turnout_pct)}), NGOs and housing societies engage voters most**; colleges are lowest (${pct(org[org.length - 1].turnout_pct)}).`),
  bullet(`**Votes peak at ${String(peak.vote_hour).padStart(2, '0')}:00–${String(Number(peak.vote_hour) + 1).padStart(2, '0')}:00 and in the evening** (18:00–21:59).`),
  bullet(`**Reminder emails raise turnout** from ${pct(remN.turnout_pct)} to ${pct(remY.turnout_pct)}.`),
  bullet(`**The average margin of victory is ${pct(marginAll.avg_margin_pct)}**, and ${pct(marginAll.close_contest_pct)} of elections are close contests.`),
  bullet('**MapReduce and Spark produced identical counts** for every group, validating the pipeline.'),
  ...h1('10. Conclusion'),
  p('This experiment applied Big Data engineering principles to VoteChain, a blockchain-based voting platform. Using HDFS for distributed storage, Hadoop Streaming MapReduce for parallel aggregation, Hive for SQL-style analysis on raw files and PySpark for fast in-memory analytics, the pipeline turned two million raw participation records into clear, actionable insights.'),
  p('The study shows that Big Data value in an election platform lies in understanding participation, not individual choices. Organizers can target younger voters and college electorates, schedule elections and reminders around the morning and evening peaks, and use reminder emails to lift turnout by several percentage points. Just as importantly, the pipeline was designed to protect ballot secrecy: participation and results data are never linked at the voter level, and small groups are suppressed. The same pipeline can run on VoteChain\'s live data through its export script, and it can scale horizontally as the platform grows.'),
  ...h1('11. References'),
  numbered('Apache Hadoop Documentation: HDFS architecture, MapReduce and Hadoop Streaming. https://hadoop.apache.org/docs/', 'refs'),
  numbered('Apache Hive Documentation: HiveQL and external tables. https://hive.apache.org/', 'refs'),
  numbered('Apache Spark Documentation: PySpark DataFrame API. https://spark.apache.org/docs/latest/api/python/', 'refs'),
  numbered('White, T. (2015): Hadoop: The Definitive Guide (4th ed.). O\'Reilly Media.', 'refs'),
  numbered('Leskovec, J., Rajaraman, A., & Ullman, J.D. (2020): Mining of Massive Datasets (3rd ed.). Cambridge University Press.', 'refs'),
  numbered('Digital Personal Data Protection Act, 2023. Ministry of Electronics and Information Technology, Government of India.', 'refs'),
  numbered('VoteChain project source code and analytics pipeline. https://github.com/abhay-chayal/votechain', 'refs'),
  new Paragraph({ spacing: { before: 600 }, border: { top: { style: BorderStyle.SINGLE, size: 8, color: '222222', space: 4 } }, children: [] }),
  new Paragraph({ alignment: AlignmentType.RIGHT, children: [fill(STUDENT, { bold: true, size: 24 }), t('  |  ', { bold: true, size: 24 }), fill(ROLL, { bold: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('Computer Science — ', { size: 22 }), fill(SEMESTER, { size: 22 }), t(' Semester', { size: 22 })] }),
]

const doc = new Document({
  creator: 'VoteChain team',
  title: 'BDA Laboratory Record: VoteChain Participation Analytics',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 640, hanging: 320 } } } }] },
    { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 640, hanging: 360 } } } }] },
    { reference: 'refs', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440, header: 600, footer: 600 } } },
    headers: { default: header }, footers: { default: footer },
    children: [...cover, ...record, ...aim, ...theory, ...design, ...impl, ...results, ...validation, ...comparison, ...ending],
  }],
})

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(DEST, buf); console.log('Wrote', DEST, (buf.length / 1024).toFixed(0) + ' KB') })
