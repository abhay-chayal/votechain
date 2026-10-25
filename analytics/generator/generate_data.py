"""
Synthetic VoteChain dataset for the Big Data Analysis (BDA) module.

Simulates VoteChain running at national scale: thousands of elections across colleges,
companies, housing societies, panchayats, NGOs and clubs in 12 Indian states.

Two files are written, and they are deliberately separate (the secret-ballot rule):

  participation.csv   one row per invited voter: demographics + whether and when they voted.
                      It never contains whom anyone voted for.
  elections.csv       one row per election: size, turnout and the top two candidate totals.
                      It never contains any voter.

The numbers are synthetic but follow realistic patterns (age mix per organization type,
higher turnout among older and smaller electorates, evening voting peaks, reminder lift),
so the analysis has real structure to find. Seeded, so every run produces the same data.

Usage:  python generate_data.py --voters 2000000 --out ../data
"""
import argparse
import csv
import math
import os
import random
from datetime import datetime, timedelta

ORG_TYPES = {
    #  type              share  median_size  sigma  base_turnout  window_days
    'College':          (0.30,  250,         0.70,  0.50,         1),
    'Company':          (0.15,  180,         0.75,  0.56,         1),
    'Housing society':  (0.25,  160,         0.60,  0.62,         2),
    'Panchayat':        (0.10,  900,         0.55,  0.71,         1),
    'NGO':              (0.10,  60,          0.60,  0.66,         1),
    'Club':             (0.10,  50,          0.60,  0.57,         2),
}

# (age mean, age sd, min, max) of the electorate for each organization type.
AGE_PROFILE = {
    'College':         (21, 2.5, 17, 30),
    'Company':         (33, 8.0, 21, 60),
    'Housing society': (48, 14.0, 22, 88),
    'Panchayat':       (42, 15.0, 18, 90),
    'NGO':             (35, 11.0, 18, 72),
    'Club':            (27, 7.0, 18, 55),
}

# Probabilities of Male, Female, Other, Prefer not to say.
GENDER_MIX = {
    'College':         (0.55, 0.43, 0.01, 0.01),
    'Company':         (0.62, 0.36, 0.01, 0.01),
    'Housing society': (0.51, 0.47, 0.005, 0.015),
    'Panchayat':       (0.51, 0.48, 0.005, 0.005),
    'NGO':             (0.45, 0.53, 0.01, 0.01),
    'Club':            (0.60, 0.38, 0.01, 0.01),
}
GENDERS = ('Male', 'Female', 'Other', 'Prefer not to say')

STATES = [  # rough population weights
    ('Uttar Pradesh', 16), ('Maharashtra', 11), ('Bihar', 9), ('West Bengal', 8),
    ('Rajasthan', 7), ('Madhya Pradesh', 7), ('Tamil Nadu', 6), ('Karnataka', 6),
    ('Gujarat', 6), ('Andhra Pradesh', 5), ('Delhi', 3), ('Kerala', 3),
]

# Hour-of-day weights for when votes are cast: a morning peak, lunch, and an evening peak.
HOUR_WEIGHTS = [1, 0, 0, 0, 0, 1, 3, 6, 9, 9, 7, 6, 6, 8, 6, 5, 5, 6, 9, 11, 12, 10, 6, 3]
# Panchayat voting is more of a morning affair.
HOUR_WEIGHTS_PANCHAYAT = [0, 0, 0, 0, 0, 2, 6, 12, 14, 13, 11, 9, 8, 7, 6, 5, 5, 5, 6, 5, 4, 2, 1, 0]

START = datetime(2025, 1, 1)
END = datetime(2026, 10, 20)


def age_turnout_effect(age, org_type):
    if age <= 25:
        return 0.0 if org_type == 'College' else -0.09
    if age <= 35:
        return -0.03
    if age <= 50:
        return 0.03
    if age <= 65:
        return 0.07
    return 0.01


def pick(weights_by_name):
    names, weights = zip(*weights_by_name)
    return random.choices(names, weights)[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voters', type=int, default=2_000_000, help='approximate number of participation rows')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'data'))
    ap.add_argument('--seed', type=int, default=2026)
    args = ap.parse_args()
    random.seed(args.seed)
    os.makedirs(args.out, exist_ok=True)

    types = list(ORG_TYPES)
    type_weights = [ORG_TYPES[t][0] for t in types]
    span = (END - START).days

    p_file = open(os.path.join(args.out, 'participation.csv'), 'w', newline='', encoding='utf-8')
    e_file = open(os.path.join(args.out, 'elections.csv'), 'w', newline='', encoding='utf-8')
    # Unix line endings: a trailing \r would end up inside the last column in Hadoop and Hive.
    pw, ew = csv.writer(p_file, lineterminator='\n'), csv.writer(e_file, lineterminator='\n')
    pw.writerow(['voter_ref', 'election_id', 'election_date', 'org_type', 'state', 'birth_year', 'gender',
                 'invited_at', 'reminded', 'signed_in', 'voted', 'voted_at'])
    ew.writerow(['election_id', 'org_type', 'state', 'election_date', 'eligible_voters', 'votes_cast',
                 'num_candidates', 'winner_votes', 'runner_up_votes'])

    rows = 0
    election_no = 0
    while rows < args.voters:
        election_no += 1
        eid = f'E{election_no:06d}'
        org = random.choices(types, type_weights)[0]
        _, median, sigma, base, window = ORG_TYPES[org]
        size = max(12, min(20000, int(random.lognormvariate(math.log(median), sigma))))
        state = pick(STATES)
        start = START + timedelta(days=random.randrange(span), hours=random.choice([0, 6, 8]))
        reminders = random.random() < 0.4
        mood = random.gauss(0, 0.06)  # election-level enthusiasm: some elections simply engage more
        size_effect = -0.045 * math.log10(size / 100)
        a_mean, a_sd, a_min, a_max = AGE_PROFILE[org]
        hours = HOUR_WEIGHTS_PANCHAYAT if org == 'Panchayat' else HOUR_WEIGHTS

        votes_cast = 0
        for _ in range(size):
            age = int(min(a_max, max(a_min, random.gauss(a_mean, a_sd))))
            birth_year = start.year - age
            gender = random.choices(GENDERS, GENDER_MIX[org])[0]
            p = base + mood + size_effect + age_turnout_effect(age, org) + (0.015 if gender == 'Female' else 0)
            if reminders:
                p += 0.06
            p = min(0.97, max(0.05, p))
            voted = random.random() < p
            signed_in = voted or random.random() < 0.25
            invited_at = start - timedelta(days=random.randint(1, 5), minutes=random.randrange(600))
            voted_at = ''
            if voted:
                day = random.randrange(window)
                hour = random.choices(range(24), hours)[0]
                t = start.replace(hour=0) + timedelta(days=day, hours=hour, minutes=random.randrange(60), seconds=random.randrange(60))
                voted_at = t.strftime('%Y-%m-%d %H:%M:%S')
                votes_cast += 1
            pw.writerow([f'{random.getrandbits(48):012x}', eid, start.strftime('%Y-%m-%d'), org, state, birth_year, gender,
                         invited_at.strftime('%Y-%m-%d %H:%M:%S'), int(reminders), int(signed_in), int(voted), voted_at])
        rows += size

        # Results: split the votes between candidates. Some races are close, some are landslides.
        n_cand = random.choices([2, 3, 4, 5, 6], [45, 30, 15, 6, 4])[0]
        shares = [random.gammavariate(random.choice([1.5, 2.5, 4.0]), 1) for _ in range(n_cand)]
        total = sum(shares)
        counts = [int(votes_cast * s / total) for s in shares]
        counts[0] += votes_cast - sum(counts)
        counts.sort(reverse=True)
        ew.writerow([eid, org, state, start.strftime('%Y-%m-%d'), size, votes_cast, n_cand, counts[0], counts[1]])

        if election_no % 1000 == 0:
            print(f'  {election_no:,} elections, {rows:,} voters')

    p_file.close()
    e_file.close()
    print(f'Done: {election_no:,} elections, {rows:,} participation rows -> {os.path.abspath(args.out)}')


if __name__ == '__main__':
    main()
