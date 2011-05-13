Categorized Command List¶

Connection handling
Command	Parameters	Description
QUIT	 -	 close the connection
AUTH	password	 simple password authentication if enabled
Commands operating on all value types
Command	Parameters	Description
EXISTS	key	 test if a key exists
DEL	key	 delete a key
TYPE	key	 return the type of the value stored at key
KEYS	pattern	 return all the keys matching a given pattern
RANDOMKEY	 -	 return a random key from the key space
RENAME	oldname newname	 rename the old key in the new one, destroying the newname key if it already exists
RENAMENX	oldname newname	 rename the oldname key to newname, if the newname key does not already exist
DBSIZE	 -	 return the number of keys in the current db
EXPIRE	 -	 set a time to live in seconds on a key
PERSIST	 -	 remove the expire from a key
TTL	 -	 get the time to live in seconds of a key
SELECT	index	 Select the DB with the specified index
MOVE	key dbindex	 Move the key from the currently selected DB to the dbindex DB
FLUSHDB	 -	 Remove all the keys from the currently selected DB
FLUSHALL	 -	 Remove all the keys from all the databases

Commands operating on string values
Command	Parameters	Description
SET	key value	 Set a key to a string value
GET	key	 Return the string value of the key
GETSET	key value	 Set a key to a string returning the old value of the key
MGET	key1 key2 ... keyN	 Multi-get, return the strings values of the keys
SETNX	key value	 Set a key to a string value if the key does not exist
SETEX	key time value	 Set+Expire combo command
MSET	key1 value1 key2 value2 ... keyN valueN	 Set multiple keys to multiple values in a single atomic operation
MSETNX	key1 value1 key2 value2 ... keyN valueN	 Set multiple keys to multiple values in a single atomic operation if none of the keys already exist
INCR	key	 Increment the integer value of key
INCRBY	key integer	 Increment the integer value of key by integer
DECR	key	 Decrement the integer value of key
DECRBY	key integer	 Decrement the integer value of key by integer
APPEND	key value	 Append the specified string to the string stored at key
SUBSTR	key start end	 Return a substring of a larger string

Commands operating on lists
Command	Parameters	Description
RPUSH	key value	 Append an element to the tail of the List value at key
LPUSH	key value	 Append an element to the head of the List value at key
LLEN	key	 Return the length of the List value at key
LRANGE	key start end	 Return a range of elements from the List at key
LTRIM	key start end	 Trim the list at key to the specified range of elements
LINDEX	key index	 Return the element at index position from the List at key
LSET	key index value	 Set a new value as the element at index position of the List at key
LREM	key count value	 Remove the first-N, last-N, or all the elements matching value from the List at key
LPOP	key	 Return and remove (atomically) the first element of the List at key
RPOP	key	 Return and remove (atomically) the last element of the List at key
BLPOP	key1 key2 ... keyN timeout	 Blocking LPOP
BRPOP	key1 key2 ... keyN timeout	 Blocking RPOP
RPOPLPUSH	srckey dstkey	 Return and remove (atomically) the last element of the source List stored at srckey and push the same element to the destination List stored at dstkey

Commands operating on sets
Command	Parameters	Description
SADD	key member	 Add the specified member to the Set value at key
SREM	key member	 Remove the specified member from the Set value at key
SPOP	key	 Remove and return (pop) a random element from the Set value at key
SMOVE	srckey dstkey member	 Move the specified member from one Set to another atomically
SCARD	key	 Return the number of elements (the cardinality) of the Set at key
SISMEMBER	key member	 Test if the specified value is a member of the Set at key
SINTER	key1 key2 ... keyN	 Return the intersection between the Sets stored at key1, key2, ..., keyN
SINTERSTORE	dstkey key1 key2 ... keyN	 Compute the intersection between the Sets stored at key1, key2, ..., keyN, and store the resulting Set at dstkey
SUNION	key1 key2 ... keyN	 Return the union between the Sets stored at key1, key2, ..., keyN
SUNIONSTORE	dstkey key1 key2 ... keyN	 Compute the union between the Sets stored at key1, key2, ..., keyN, and store the resulting Set at dstkey
SDIFF	key1 key2 ... keyN	 Return the difference between the Set stored at key1 and all the Sets key2, ..., keyN
SDIFFSTORE	dstkey key1 key2 ... keyN	 Compute the difference between the Set key1 and all the Sets key2, ..., keyN, and store the resulting Set at dstkey
SMEMBERS	key	 Return all the members of the Set value at key
SRANDMEMBER	key	 Return a random member of the Set value at key

Commands operating on sorted zsets (sorted sets)
Command	Parameters	Description
ZADD	key score member	 Add the specified member to the Sorted Set value at key or update the score if it already exist
ZREM	key member	 Remove the specified member from the Sorted Set value at key
ZINCRBY	key increment member	 If the member already exists increment its score by increment, otherwise add the member setting increment as score
ZRANK	key member	 Return the rank (or index) or member in the sorted set at key, with scores being ordered from low to high
ZREVRANK	key member	 Return the rank (or index) or member in the sorted set at key, with scores being ordered from high to low
ZRANGE	key start end	 Return a range of elements from the sorted set at key
ZREVRANGE	key start end	 Return a range of elements from the sorted set at key, exactly like ZRANGE, but the sorted set is ordered in traversed in reverse order, from the greatest to the smallest score
ZRANGEBYSCORE	key min max	 Return all the elements with score >= min and score <= max (a range query) from the sorted set
ZCOUNT	key min max	 Return the number of elements with score >= min and score <= max in the sorted set
ZCARD	key	 Return the cardinality (number of elements) of the sorted set at key
ZSCORE	key element	 Return the score associated with the specified element of the sorted set at key
ZREMRANGEBYRANK	key min max	 Remove all the elements with rank >= min and rank <= max from the sorted set
ZREMRANGEBYSCORE	key min max	 Remove all the elements with score >= min and score <= max from the sorted set
ZUNIONSTORE / ZINTERSTORE	dstkey N key1 ... keyN WEIGHTS w1 ... wN AGGREGATE SUM|MIN|MAX	 Perform a union or intersection over a number of sorted sets with optional weight and aggregate

Commands operating on hashes
Command	Parameters	Description
HSET	key field value	 Set the hash field to the specified value. Creates the hash if needed.
HGET	key field	 Retrieve the value of the specified hash field.
HMGET	key field1 ... fieldN	 Get the hash values associated to the specified fields.
HMSET	key field1 value1 ... fieldN valueN	 Set the hash fields to their respective values.
HINCRBY	key field integer	 Increment the integer value of the hash at key on field with integer.
HEXISTS	key field	 Test for existence of a specified field in a hash
HDEL	key field	 Remove the specified field from a hash
HLEN	key	 Return the number of items in a hash.
HKEYS	key	 Return all the fields in a hash.
HVALS	key	 Return all the values in a hash.
HGETALL	key	 Return all the fields and associated values in a hash.

Sorting
Command	Parameters	Description
SORT	key BY pattern LIMIT start end GET pattern ASC|DESC ALPHA	 Sort a Set or a List accordingly to the specified parameters

Transactions
Command	Parameters	Description
MULTI/EXEC/DISCARD/WATCH/UNWATCH	 -	 Redis atomic transactions

Publish/Subscribe
Command	Parameters	Description
SUBSCRIBE/UNSUBSCRIBE/PUBLISH	 -	 Redis Public/Subscribe messaging paradigm implementation

Persistence control commands
Command	Parameters	Description
SAVE	 -	 Synchronously save the DB on disk
BGSAVE	 -	 Asynchronously save the DB on disk
LASTSAVE	 -	 Return the UNIX time stamp of the last successfully saving of the dataset on disk
SHUTDOWN	 -	 Synchronously save the DB on disk, then shutdown the server
BGREWRITEAOF	 -	 Rewrite the append only file in background when it gets too big

Remote server control commands
Command	Parameters	Description
INFO	 -	 Provide information and statistics about the server
MONITOR	 -	 Dump all the received requests in real time
SLAVEOF	 -	 Change the replication settings
CONFIG	 -	 Configure a Redis server at runtime
