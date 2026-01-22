
import requests
import time
import json

BASE_URL = "http://localhost:8080/api"

def run_test():
    timestamp = int(time.time())
    rec_email = f"rec_{timestamp}@test.com"
    cand_email = f"cand_{timestamp}@test.com"
    password = "password"

    print(f"Testing with Recruiter: {rec_email} and Candidate: {cand_email}")

    # 1. Register Recruiter
    print("1. Registering Recruiter...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": rec_email, "password": password, "firstName": "Rec", "lastName": "One", "role": "RECRUITER"
    })
    if res.status_code != 200:
        print(f"Failed to register recruiter: {res.text}")
        return
    token_rec = res.json()['token']
    print("   Recruiter Registered & Logged in.")

    # 2. Create Job
    print("2. Creating Job...")
    res = requests.post(f"{BASE_URL}/job/create", headers={"Authorization": f"Bearer {token_rec}"}, json={
        "title": f"Test Job {timestamp}",
        "requirements": "Java",
        "companyName": "TestCorp",
        "description": "A test job",
        "salary": 150000
    })
    if res.status_code != 200:
        print(f"Failed to create job: {res.text}")
        return
    print("   Job Created.")

    # 3. Register Candidate
    print("3. Registering Candidate...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": cand_email, "password": password, "firstName": "Cand", "lastName": "One", "role": "CANDIDATE"
    })
    if res.status_code != 200:
        print(f"Failed to register candidate: {res.text}")
        return
    token_cand = res.json()['token']
    print("   Candidate Registered & Logged in.")

    # 4. Fetch All Jobs as Candidate
    print("4. Fetching All Jobs as Candidate...")
    res = requests.get(f"{BASE_URL}/job/all", headers={"Authorization": f"Bearer {token_cand}"})
    if res.status_code == 200:
        jobs = res.json()
        print(f"   Success! Found {len(jobs)} jobs.")
        found = False
        for job in jobs:
            if job['title'] == f"Test Job {timestamp}":
                print(f"   Verified: Found our job '{job['title']}'")
                found = True
                break
        if not found:
            print("   Error: Did not find the job we just created.")
    else:
        print(f"   Failed to fetch jobs: {res.status_code} {res.text}")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"An error occurred: {e}")
