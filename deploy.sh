cp demo -r _demo
git init 
git add -A 
git commit -m 'Update Demo'
git push -u origin
git push -f git@github.com:jiangtao/blog.git master:gh-pages
