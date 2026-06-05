### Infrastructure & Deployment Journey Summary

**Infrastructure Setup**

* Created Oracle Cloud Free Tier Ubuntu VM.
* Created Oracle Managed MySQL Database.
* Deployed NestJS + Prisma backend.
* Configured Nginx reverse proxy.
* Connected custom domain `tusharpanchal.qd.je`.

---

### Problem 1 — Wrong MySQL Connection Method

**Issue:** Tried `mysql -u root -p` on VM expecting managed DB access.

**Fix:** Connected using managed DB private IP:

```bash
mysql -h 10.0.0.165 -P 3306 -u tushar-oracle -p
```

---

### Problem 2 — MySQL Port 3306 Blocked

**Issue:** VM could not reach managed database.

**Fix:** Added TCP 3306 ingress rule in Oracle VCN Security List.

---

### Problem 3 — NSG Blocking Database Access

**Issue:** Database still unreachable after Security List changes.

**Fix:** Added TCP 3306 ingress rule to the database NSG.

---

### Problem 4 — Oracle IAM Permission Errors

**Issue:** Couldn't modify NSG and database settings.

**Fix:** Added OCI policies for:

* `mysql-family`
* `virtual-network-family`

---

### Problem 7 — Free domain from digitalplat

**Issue:** nameserver problems

---

### Problem 8 — DNS / Domain Setup Confusion

**Issue:** Cloudflare rejected `tusharpanchal.qd.je` because it is a subdomain, not a root domain.

**Fix:** Used alternate DNS management and created: https://freedns.afraid.org/domain/ 

```text
A Record
tusharpanchal.qd.je → 80.225.239.91
```

---

### Problem 9 — DNS Propagation Verification

**Issue:** Unsure whether domain was resolving correctly.

**Fix:**

```bash
nslookup tusharpanchal.qd.je 8.8.8.8
```

Verified:

```text
tusharpanchal.qd.je → 80.225.239.91
```

---

### Problem 10 — Nginx Server Name Misconfiguration

**Issue:** Nginx was configured with:

```nginx
server_name _;
```

instead of the actual domain.

**Fix:**

```nginx
server_name tusharpanchal.qd.je;
```

---

### Problem 11 — HTTPS / SSL Setup

**Issue:** Needed HTTPS support for the domain.

**Fix:**

```bash
sudo certbot --nginx -d tusharpanchal.qd.je
```

Generated and installed Let's Encrypt SSL certificate.

---

### Problem 12 — Port 443 / Oracle Networking Concerns

**Issue:** Unsure whether Oracle NSG, VCN, Security Lists, and VM firewall allowed HTTPS.

**Fix:** Verified SSL was active and Nginx was listening on 443 after Certbot configuration.

---

### Problem 13 — Backend Works Locally But Domain Returns 404

**Issue:**

```bash
curl http://localhost:3000/api/categories/hierarchical-totals
```

worked, but:

```bash
curl https://tusharpanchal.qd.je/api/categories/hierarchical-totals
```

returned Nginx 404.

**Fix:** Identified issue in Nginx reverse proxy configuration and began debugging `location`, `proxy_pass`, and `try_files` behavior.

---

### Problem 14 — Understanding Multi-Layer Debugging

**Issue:** Difficult to determine whether failures came from:

* Backend
* Prisma
* Database
* DNS
* SSL
* Nginx
* Oracle Networking

**Fix:** Learned to debug layer-by-layer:

```text
Application
↓
Localhost
↓
Nginx
↓
HTTP/HTTPS
↓
DNS
↓
Internet
```

---

## Major Things Learned

* Oracle Cloud VCN Networking
* Security Lists
* Network Security Groups (NSG)
* Oracle IAM Policies
* Managed MySQL Databases
* SSH Tunneling
* NestJS Production Deployment
* Prisma Configuration
* DNS Records (A Records)
* Domain vs Subdomain
* Nginx Reverse Proxy
* Let's Encrypt SSL
* HTTP vs HTTPS
* Cloud Debugging Methodology

---

## Final Architecture Built

```text
Browser
↓
tusharpanchal.qd.je
↓
DNS
↓
80.225.239.91 (Oracle VM)
↓
Nginx
↓
NestJS Backend (:3000)
↓
Prisma
↓
Oracle Managed MySQL (10.0.0.165)
```

This wasn't just a deployment. You had to solve networking, permissions, DNS, SSL, reverse proxy, database connectivity, ORM configuration, and cloud infrastructure problems across multiple layers. That's the kind of troubleshooting experience that actually teaches how production systems work.
