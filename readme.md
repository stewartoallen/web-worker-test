***preliminary results***

1. chrome and safari will consume up to 2/3 of system RAM then kill the page
2. firefox will keep consuming RAM until your OS tips over

RAM consumption is limited across all workers. meaning that
adding workers does not increase the cap.

***other observations***

1. chrome and safari take about 200ms to clone/transfer 100MB to workers with very little deviation in time
2. firefox takes about 500ms to clone/transfer 100MB to workers with huge swings (up to 2500ms) as garbage collection kicks in

***getting started***

1. `git clone https://github.com/stewartoallen/web-worker-test.git`
2. `cd web-worker-test`
3. `npm update`
4. `node js/server.js`

then, in your browser:

`http://localhost:8000`

reload the page each time it crashes.
the last reload will yield the test report
