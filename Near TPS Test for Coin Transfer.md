## Near TPS Test for Coin Transfer

##### Hardware: dedicated server at nocix.net

- Processor 2x E5-2660 @ 2.2GHz / 3GHz Turbo 16 Cores / 32 thread
- Ram 96 GB DDR3
- Disk 960 GB SSD
- Bandwidth 1Gbit Port: 200TB Transfer
- Operating System Ubuntu 18.04 (Bionic)

##### Network setup

- A network of 5 nodes was run.
- All nodes used the same IP, but different ports.
- All nodes were validators.
- It was tested by using the default shard size of 1 when network files are generated.

##### Test setup for native coin transfer

- 100000 accounts were created for coin transfer
- 30000 native coin txs were submitted to the network as fast as possible
  - Each tx moved 1 NEAR between two different randomly chosen accounts
  - The number of accounts was chosen to be equal to the number of total txs so that there would be a low chance of a tx getting rejected due to another transaction from the same account still pending.

##### Test result

- Tests are taken starting from 1000 tps to 2000 tps with spammers for 10 seconds. Time between the start of the test and the last block to process txs from the test was measured.
- Spam rate + duration + spammers = Total txs / Total spam rate ==> Avg TPS (Time taken)
  ```
  100 + 10 +  1 =  1000 /  100 =  77 (12s)
  200 + 10 +  1 =  2000 /  200 =  91 (21s) ,  90 (22s)
  100 + 10 +  2 =  2000 /  200 = 147 (13s)
  100 + 10 +  4 =  4000 /  400 = 256 (15s)
  100 + 10 +  5 =  5000 /  500 = 301 (16s) , 295 (16s)
  200 + 10 +  5 = 10000 / 1000 = 348 (28s)
  100 + 10 + 10 = 10000 / 1000 = 543 (18s) , 511 (19s)
  150 + 10 + 10 = 15000 / 1500 = 526 (28s)
  100 + 10 + 15 = 15000 / 1500 = 590 (25s) , 583 (25s)
  150 + 10 + 15 = 22500 / 2250 = 604 (37s)
  100 + 10 + 20 = 20000 / 2000 = 653 (30s) , 677 (29s) , 719 (27s)
  100 + 10 + 30 = 30000 / 1000
  run into many `Retrying request to broadcast_tx_commit` logs when spamming
  ```
- Estimated average tps is **500 - 700** TPS

##### Instructions to recreate this test

1.  Install required tools and dependencies.
    1. We will use nearup to spin up the network by attaching the latest nearcore to it.
    2. [https://docs.near.org/docs/develop/node/validator/compile-and-run-a-node#localnet](https://docs.near.org/docs/develop/node/validator/compile-and-run-a-node#localnet)
    3. First install nearcore as described above.
       1. git clone [https://github.com/near/nearcore](https://github.com/near/nearcore)
       2. cd nearcore
       3. git checkout master
       4. make neard
    4. [https://github.com/near/nearup](https://github.com/near/nearup)
    5. Install nearup as describe in above link.
       1. pip3 install --user nearup
2.  Create a 5 local nodes network.

    1.  Spin up 5 validators network by running
        - _nearup run localnet --num-nodes 5 --binary-path $HOME/Near/nearcore/target/release_ _--override_
        - Replace _$HOME/Near/nearcore/target/release_ with the path you have installed _[nearcore](https://github.com/near/nearcore)_
    2.  The config and data files are created in location _$HOME/.near/localnet_.
    3.  The logs are placed in _$HOME/.nearup/logs._
    4.  Look into step no.3(3) to create accounts.
    5.  After creating the accounts, set these accounts to _genesis.json_ file to fund. The genesis file is located in _$HOME/.near/localnet/node0/genesis.json_ We need to add in _records_ field as following. eg.

        ```
         "records": [
           {
             "Account": {
               "account_id": "node0",
               "account": {
                 "amount": "950000000000000000000000000000000",
                 "locked": "50000000000000000000000000000000",
                 "code_hash": "11111111111111111111111111111111",
                 "storage_usage": 0,
                 "version": "V1"
               }
             }
           },
           {
             "AccessKey": {
               "account_id": "node0",
               "public_key": "ed25519:7PGseFbWxvYVgZ89K1uTJKYoKetWs7BJtbyXDzfbAcqX",
               "access_key": {
                 "nonce": 0,
                 "permission": "FullAccess"
               }
             }
           },
           ...Existing accounts when genesis file is created
           ...Add new accounts here
           {
             "Account": {
               "account_id": "account0",
               "account": {
                 "amount": "1000000000000000000000000000000000",
                 "locked": "0",
                 "code_hash": "11111111111111111111111111111111",
                 "storage_usage": 0,
                 "version": "V1"
               }
             }
           },
           {
             "AccessKey": {
               "account_id": "account0",
               "public_key": "ed25519:DVRDYQHtn1mNCA25AetySiGRmBNgTSge1DitxMGG3VV9",
               "access_key": {
                 "nonce": 0,
                 "permission": "FullAccess"
               }
             }
           },
           ...
        ```

    6.  Also edit the _total_supply_.

        1.  Easy way of changing value is (this can be wrong too, just show here for easy change.)

            if we create 10 accounts with the spam-client, just add 1 in front of the existing value.

            ```
             "total_supply": "16000000000000000000000000000000000",
            ```

            If we create 100000 accounts with the spam-client, just add 10000 in front of the existing value.

            ```
             "total_supply": "100006000000000000000000000000000000000",
            ```

        2.  Each account created by the spam-client is funded (1000000000000000000000000000000000)

            ```
            1000000000000000000000000000000000 * number of accounts + existing total_supply = total_value
            ```

            ```
            "total_supply" : total_value
            ```

        3.  If its value is still wrong , when the network is started, the network will fail with value mismatch issue and you can add its value from the log.
            The log is located in $HOME/.nearup/logs/localnet/node\*.log

    7.  Copy the genesis.file of node0 to all other nodes.
        - _cp localnet/node0/genesis.json localnet/node\*/genesis.json_
    8.  Now we need to start network again with this modified version.
        1. To stop the network.
           - _nearup stop_
        2. To clean the network data.
           - _rm -fr ~/.near/localnet/node\*/data_
        3. To re-start the network.
           - _nearup run localnet --num-nodes 5 --binary-path $HOME/Near/nearcore/target/release_
           - Replace _$HOME/Near/nearcore/target/release_ with the path you have installed _[nearcore](https://github.com/near/nearcore)_

3.  Custom script used for running transactions to the network.

    1.  [https://gitlab.com/shardeum/smart-contract-platform-comparison/near](https://gitlab.com/shardeum/smart-contract-platform-comparison/near)
    2.  cd near/spam-client && npm install && npm link
    3.  To generate accounts that are to be added in the genesis.file before the network started.
        - _spammer accounts --number [number]_
          This will create accounts.json and publicAddresses.json files under the directory.
          See step no.2(5) for additional steps.
    4.  Spam the network with these accounts and check the average TPS in each spam with step (5)

        - spammer spam --duration [number] --rate [number] --start [number] --end [number]

          --start (optional) is for the start index number of the accounts to use when spamming

          --end (optional) is for the end index number of the accounts to use when spamming

          e.g. To spam the network for 5 seconds with 10 tps

          - _spammer spam --duration 5 --rate 10 --start 0 --end 1000_

        - This will output the lastestBlockBeforeSpamming in the log. Use this to check TPS.

    5.  Check the average TPS of the spam.

        - _spammer check_tps --startblock [number] --output [json_file_name]_

          _spammer check_tps --startblock 158 --output s158.json_

    6.  In order to send higher txs, we use spam-client-orchestrator to spam from many terminals.
        1. cd near/spam-client-orchestrator && npm install
        2. Add the value (number of accounts you created in step no.3(3)) in _total_accounts_ variable in orchestrator.js. This will divide how many accounts to use for each client.
        3. Check out the README for usage.
