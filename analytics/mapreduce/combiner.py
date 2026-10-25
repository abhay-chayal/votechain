#!/usr/bin/env python3
"""
Hadoop Streaming combiner: adds up (invited, voted) per key on each mapper's machine
before the shuffle, so far less data crosses the network. Input and output have the
same format as the mapper's output:  <key> TAB <invited> TAB <voted>
"""
import sys


def main():
    current, invited, voted = None, 0, 0
    for line in sys.stdin:
        key, i, v = line.rstrip('\n').split('\t')
        if key != current:
            if current is not None:
                print(f'{current}\t{invited}\t{voted}')
            current, invited, voted = key, 0, 0
        invited += int(i)
        voted += int(v)
    if current is not None:
        print(f'{current}\t{invited}\t{voted}')


if __name__ == '__main__':
    main()
