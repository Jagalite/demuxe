from build import *
for n in ['mono','dual','left','right']:
 ff('-i',F/(n+'.opus'),'-c:a','copy',F/(n+'.webm'));probe(n+'.webm')
