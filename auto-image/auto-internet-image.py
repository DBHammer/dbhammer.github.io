import sys
import os
import re
import requests
import uuid
import mimetypes


if len(sys.argv) < 2:
    print("Usage: auto-image mdfile")
    os.exit(0)

filein = sys.argv[1]
with open(filein) as fin:
    lines = fin.readlines()

picrepo = f"{os.path.dirname(os.path.abspath(__file__))}{os.path.sep}picrepo"

pat = re.compile(r"^(.*)!\[(.*)\]\((.*)\)(.*)$")
for lineno in range(len(lines)):
    mat = pat.match(lines[lineno])
    if mat != None:
        print(f"Processing line {lineno}")
        prefix = mat.group(1)
        imgalt = mat.group(2)
        imgurl = mat.group(3)
        suffix = mat.group(4)
        response = requests.get(imgurl)
        filext = mimetypes.guess_extension(response.headers['Content-Type'])
        filename = uuid.uuid4()
        filepath = f"{picrepo}{os.path.sep}{filename}{filext}"
        open(filepath, "wb").write(response.content)
        baseindex = filepath.index(f"{os.path.sep}auto-image")
        relpath = filepath[baseindex:]
        lines[lineno] = f"{prefix}![{imgalt}]({relpath}){suffix}"


open(f"{filein}.rewrite.md", "w").writelines(lines)