#!/bin/zsh
cd -- "${0:A:h}" || exit 1
./.runtime/node22/bin/node directus/scripts/local-service.mjs status
cms_result=$?
if [[ -t 0 ]]; then read -r '?Nhấn Enter để đóng cửa sổ...'; fi
exit "$cms_result"
