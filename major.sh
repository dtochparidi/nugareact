node ./scripts/major.js

message=${1:-major update}
target=${2:-master}
# target=${2:-paralaxGrid}
# target=${2:-fixedWidth}
# target=${2:-daysInteractionRedesign}

git add ./
git commit -m "$message"
git push origin "$target"