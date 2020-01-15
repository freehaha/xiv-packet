# Usage
```js
const { unpackPacket, parsePackets } = require(".");
// get packet using pcap/machina..
let rawPacket = Buffer.from(
  "9c00000053010810530108100300000014006b0200002605ff701e5e00000000" +
    "53010810000000001a0e000078630000cdcccc3d000000e01100db1e1a0e0001" +
    "0001000000000000edf1040000000000c56c1c00000000801a0e000000000000" +
    "0000000000000000000000000000000000000000000000000000000000000000" +
    "00000000000000000000f20000000000530108100000000000000000",
  "hex"
);
let packet = unpackPacket(rawPacket);
let events = parsePackets([packet]);
console.log(events);
```

# Event types
Events parsed from `parsePackets` will have one of the following `type`:
```
  const enum EventTypes {
    PC = "PC",
    STATUS_LIST = "STATUS_LIST",
    ACTION = "ACTION",
    ZONE_IN = "ZONE_IN",
    STATUS_SYNC = "STATUS_SYNC",
    ALLIANCE_INFO = "ALLIANCE_INFO",
    PARTY_INFO = "PARTY_INFO",
    NPC_SPAWN = "NPC_SPAWN",
    OBJ_SPAWN = "OBJ_SPAWN",
    STATUS = "STATUS",
    ACTION8 = "ACTION8",
    ACTION16 = "ACTION16",
    ACTION24 = "ACTION24",
    ACTION32 = "ACTION32",
    CASTING = "CASTING",
    TICK = "TICK",
    STATUS_STATS = "STATUS_STATS"
  }
```
## Time resolution

Time parsed from individual packet only has precision up to seconds. If you have a time
millisecond timestamp you got from the batch packet you can pass it as the 2nd argument
to `unpackPacket` and it will be returned as the time instead.

# Acknowledgement

Most of the status/action data is collected from [Xivapi.com](https://xivapi.com/)
