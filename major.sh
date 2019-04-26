message=${1:-updates}
# target=${2:-master}
target=${2:-paralaxGrid}

git add ./
git commit -m "$message"
git push origin "$target"