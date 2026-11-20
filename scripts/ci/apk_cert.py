"""Compute an APK signer's certificate SHA-256 from verified apksigner PEM output."""
import base64
import hashlib
import re
import sys


def signer_digest(text):
    blocks = re.findall(r'-----BEGIN CERTIFICATE-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END CERTIFICATE-----', text)
    certificates = {base64.b64decode(re.sub(r'\s+', '', block), validate=True) for block in blocks}
    if len(certificates) != 1:
        raise ValueError('Expected one distinct signing certificate')
    return hashlib.sha256(next(iter(certificates))).hexdigest()


if __name__ == '__main__':
    print(signer_digest(sys.stdin.read()))
