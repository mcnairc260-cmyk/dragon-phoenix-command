#!/bin/bash
cd "$(dirname "$0")"
: > fetch.log
while read -r id url; do
  [ -z "$id" ] && continue
  if [ ! -s "$id.png" ]; then
    code=$(curl -sSL -o "$id.png" -w "%{http_code}" "$url")
    echo "$id $code $(stat -c %s "$id.png" 2>/dev/null)" >> fetch.log
    [ "$code" = "200" ] || rm -f "$id.png"
  fi
done < urls.txt
cat fetch.log
