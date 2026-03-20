
## 📌 Overview

Our project is a multi-branch development setup built using this base branch called `basic-dashboard`. Over time, additional features and improvements were developed on top of this base by creating new branches.

---

## 🌿 Branching Strategy

* `basic-dashboard`
  This is the **initial/base branch** containing the foundational dashboard implementation.

* login+dash
  was created from `basic-dashboard` and include **additional updates, improvements, and new features**.

⚠️ **Important Note:**
The new branche is **ahead of `basic-dashboard`**, meaning it contain newer commits that are not present in the base branch.
We have intentionally **not deleted `basic-dashboard`** to preserve the original starting point of the project.

---



### 1. Checkout the desired branch

👉 If you want the **latest version with updates**, use a feature branch:

```bash
git checkout login+dash
```

👉 If you want the **base version**, use:

```bash
git checkout basic-dashboard
```

---





## 🧠 Notes for Reviewers

* The `basic-dashboard` branch represents the **initial implementation**.
* Subsequent work has been done in separate branches to maintain modular development.
* To view the **most complete and updated version**, please refer to the latest branches.

---


