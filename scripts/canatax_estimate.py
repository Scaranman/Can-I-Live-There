#!/usr/bin/env python3
"""Read one JSON object from stdin { income, province }; print JSON estimate to stdout."""
import json
import sys

try:
    from canatax import IncomeTaxCalculator
except ImportError:
    print(json.dumps({"error": "canatax_not_installed"}), file=sys.stderr)
    sys.exit(1)


def main() -> None:
    data = json.loads(sys.stdin.read())
    income = float(data["income"])
    province = str(data["province"]).upper()
    est = IncomeTaxCalculator.calculate(income=income, province=province)
    out = {
        "federal_tax": float(est.federal_tax),
        "provincial_tax": float(est.provincial_tax),
        "cpp": float(getattr(est, "cpp", 0) or 0),
        "ei": float(getattr(est, "ei", 0) or 0),
        "total_tax": float(est.total_tax),
        "net_income": float(est.net_income),
    }
    for attr in ("qpp", "qpip"):
        v = getattr(est, attr, None)
        if v is not None:
            out[attr] = float(v)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
