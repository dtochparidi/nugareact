message=${1:-updates}
target=${2:-master}

git add ./
git commit -m "$message"
git push origin "$target"