#!/usr/bin/env python3
"""
Hadoop Streaming reducer: totals per key and the turnout percentage.

Input (sorted by key):  <key> TAB <invited> TAB <voted>
Output:                 <key> TAB <invited> TAB <voted> TAB <turnout %>

Privacy rule (small-cell suppression): a group with fewer than MIN_GROUP people is
not reported, so no result can point at an individual.
"""
import sys

MIN_GROUP = 10


def emit(key, invited, voted):
    if invited < MIN_GROUP:
        print(f'{key}\tsuppressed (<{MIN_GROUP})\t\t')
    else:
        print(f'{key}\t{invited}\t{voted}\t{100 * voted / invited:.2f}')


def main():
    current, invited, voted = None, 0, 0
    for line in sys.stdin:
        key, i, v = line.rstrip('\n').split('\t')
        if key != current:
            if current is not None:
                emit(current, invited, voted)
            current, invited, voted = key, 0, 0
        invited += int(i)
        voted += int(v)
    if current is not None:
        emit(current, invited, voted)


if __name__ == '__main__':
    main()
