# VeriCheck MongoDB Collections

Database: vericheck

This document describes the collections, their fields, and relationships.

1) users
- _id: ObjectId
- email: string (unique, lowercased)
- password_hash: string
- roles: [string] (e.g., ["admin"], ["user"])
- created_at: Date
- last_login_at: Date|null

2) claims
- _id: ObjectId
- text: string (claim text)
- status: string (enum: queued, processing, triage, fetch_sources, analyze, score, complete, failed)
- user_id: ObjectId (ref: users._id)
- created_at: Date
- updated_at: Date

3) sources
- _id: ObjectId
- claim_id: ObjectId (ref: claims._id)
- title: string
- url: string
- snippet: string|null
- reliability_score: number (0..1)
- stance: string (enum: support, refute, neutral)
- provider: string (e.g., "google", "wikipedia")
- fetched_at: Date

4) analyses
- _id: ObjectId
- claim_id: ObjectId (ref: claims._id)
- summary: string
- score: number (0..1)
- created_at: Date

5) metrics_daily
- _id: ObjectId
- date: Date (UTC midnight)
- total_claims: number
- avg_score: number
- p50_latency_ms: number
- p95_latency_ms: number
- success_rate: number (0..1)
