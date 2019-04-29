node ./scripts/patch.js

message=${1:-patch}
# target=${2:-master}
# target=${2:-paralaxGrid}
target=${2:-fixedWidth}

git add ./
git commit -m "$message"
git push origin "$target"