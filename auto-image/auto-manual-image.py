import sys
import os
import re
import requests
import uuid
import mimetypes
from requests_file import FileAdapter

session = requests.Session()
session.mount('file://', FileAdapter())


if len(sys.argv) < 2:
    print("Usage: auto-image mdfile")
    os.exit(0)

filein = sys.argv[1]
with open(filein) as fin:
    lines = fin.readlines()

picrepo = f"{os.path.dirname(os.path.abspath(__file__))}{os.path.sep}picrepo"

pat = re.compile(r"^(.*)(/auto-image/picrepomanual/.*(\.(?:png|jpg)))(.*)$")
for lineno in range(len(lines)):
    mat = pat.match(lines[lineno])
    if mat != None:
        print(f"Processing line {lineno}")
        prefix = mat.group(1)
        imgpath = mat.group(2)
        imgext = mat.group(3)
        suffix = mat.group(4)

        imgurl = f"file://{os.getcwd()}/{imgpath}"
        # print(imgurl)
        response = session.get(imgurl)
        filext = imgext
        filename = uuid.uuid4()
        filepath = f"{picrepo}{os.path.sep}{filename}{filext}"
        open(filepath, "wb").write(response.content)
        baseindex = filepath.index(f"{os.path.sep}auto-image")
        relpath = filepath[baseindex:]
        lines[lineno] = f"{prefix}{relpath}{suffix}\n"


open(f"{filein}.rewrite.md", "w").writelines(lines)