#!/usr/bin/env python3
"""
Hadoop Streaming mapper: turnout by one dimension of participation.csv.

Usage (the dimension is passed as an argument):
    mapper.py age_group | gender | org_type | state | vote_hour

For every voter row it emits:   <key> TAB <invited=1> TAB <voted=0|1>
For vote_hour, only voters who voted are emitted, keyed by the hour they voted.
"""
import sys

# participation.csv columns
ELECTION_DATE, ORG_TYPE, STATE, BIRTH_YEAR, GENDER, VOTED, VOTED_AT = 2, 3, 4, 5, 6, 10, 11


def age_group(birth_year, election_date):
    age = int(election_date[:4]) - int(birth_year)
    if age <= 25:
        return '18-25'
    if age <= 35:
        return '26-35'
    if age <= 50:
        return '36-50'
    if age <= 65:
        return '51-65'
    return '65+'


def main():
    dim = sys.argv[1] if len(sys.argv) > 1 else 'age_group'
    for line in sys.stdin:
        f = line.rstrip('\r\n').split(',')
        if len(f) < 12 or f[0] == 'voter_ref':  # skip the header and malformed lines
            continue
        voted = f[VOTED]
        if dim == 'age_group':
            key = age_group(f[BIRTH_YEAR], f[ELECTION_DATE])
        elif dim == 'gender':
            key = f[GENDER]
        elif dim == 'org_type':
            key = f[ORG_TYPE]
        elif dim == 'state':
            key = f[STATE]
        elif dim == 'vote_hour':
            if voted != '1':
                continue
            key = f[VOTED_AT][11:13]
        else:
            sys.exit(f'unknown dimension: {dim}')
        print(f'{key}\t1\t{voted}')


if __name__ == '__main__':
    main()
