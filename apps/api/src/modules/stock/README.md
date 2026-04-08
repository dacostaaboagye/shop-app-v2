# Stock Module

Owns:

- stock balance
- stock reservations
- availability calculation
- reservation confirmation and release
- expiry jobs and balance synchronization

This module is concurrency-sensitive. Stock mutations must be transactional.

