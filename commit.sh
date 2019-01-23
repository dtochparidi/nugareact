message=${1:-updates}

git add ./
git commit -m "$message"
git push origin master