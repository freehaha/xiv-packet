const _statuses = require("./statuses.json");
const _skills = require("./actions.json");

const EventTypes = {
  PC: "PC",
  STATUS_LIST: "STATUS_LIST",
  ACTION: "ACTION",
  ZONE_IN: "ZONE_IN",
  STATUS_SYNC: "STATUS_SYNC",
  ALLIANCE_INFO: "ALLIANCE_INFO",
  PARTY_INFO: "PARTY_INFO",
  NPC_SPAWN: "NPC_SPAWN",
  OBJ_SPAWN: "OBJ_SPAWN",
  STATUS: "STATUS",
  ACTION8: "ACTION8",
  ACTION16: "ACTION16",
  ACTION24: "ACTION24",
  ACTION32: "ACTION32",
  CASTING: "CASTING",
  TICK: "TICK",
  STATUS_STATS: "STATUS_STATS"
};

module.exports.EventTypes = EventTypes;

let skills = {};
let statuses = {};
_skills.forEach(skill => {
  skills[skill.id] = skill;
  if (skill.effects) {
    skill.effects.forEach(status => {
      statuses[status.id] = status;
    });
  }
});

_statuses.forEach(status => {
  if (!statuses[status.id]) {
    statuses[status.id] = status;
  } else {
    statuses[status.id] = {
      ...statuses[status.id],
      ...status
    };
  }
});

const PTYPE = require("./ptypes.json");
const DamagingEffect = new Set(["damage", "block", "parried"]);
const EFFECT_TYPE = {
  0: "",
  1: "miss",
  2: "full resist",
  3: "damage",
  4: "heal",
  5: "block",
  6: "parried",
  7: "invulnerable",
  8: "no effect",
  9: "unknown0",
  10: "mp loss",
  11: "mp gain",
  12: "tp loss",
  13: "tp gain",
  14: "gp gain",
  15: "apply status",
  16: "apply status(self)",
  28: "action combo",
  33: "knockback",
  38: "mount",
  59: "vfx"
};

const TICK_TYPE = {
  0x0017: "DOT",
  0x0015: "STATUS_REMOVE",
  0x0014: "STATUS_GAIN",
  0x0006: "DEATH",
  0x0022: "MARK",
  0x0197: "ANIMATION"
};

function parseEffects(effects) {
  let offset = 0;
  let out = [];
  while (offset <= 56 && offset < effects.byteLength - 8) {
    let view = new DataView(effects, offset, 8);
    let effectType = view.getUint8(0);
    const severity = view.getUint8(1);
    const param = view.getUint8(2);
    const bonus = view.getUint8(3);
    const mod = view.getUint8(4);
    const flags = view.getUint8(5);
    let value = view.getUint16(6, true);
    let effectTypeName = "unknown";
    if (EFFECT_TYPE[effectType]) {
      effectTypeName = EFFECT_TYPE[effectType];
    }
    offset += 8;
    if (effectType === 0) continue;
    if (
      (DamagingEffect.has(effectTypeName) || effectTypeName === "heal") &&
      flags & 0x40
    ) {
      value = value + mod * 0xffff;
    }

    out.push({
      // flags: flags.toString(16),
      flags,
      effectType,
      effectTypeName,
      // severity: severity.toString(16),
      severity: severity,
      param,
      bonus,
      mod,
      value
    });
  }
  return out;
}

function parseAction(action) {
  // my ($source, $skill, $actions, $target) = unpack("@[4]H8 @[60]H4 @[74]a[64] x[6] H8", $block);
  let view = new DataView(action);
  let skill = view.getUint16(28, true);
  let chunk = action.slice(42, 64 + 42);
  let effects = parseEffects(chunk);
  let target = view.getUint32(112, true);

  return {
    skill,
    effects,
    target
  };
}

function parseCasting(cast) {
  let view = new DataView(cast);
  const skill = view.getUint16(0, true);
  const castTime = view.getFloat32(8, true);
  const target = view.getUint32(12, true);
  return {
    skill,
    castTime,
    target
  };
}

function parseStatusList(packet) {
  let view = new DataView(packet);
  let hp = view.getUint32(4, true);
  let maxHp = view.getUint32(8, true);
  let shield = view.getUint8(18);
  let chunk = packet.slice(20);
  let status = [];
  while (chunk.byteLength >= 12) {
    view = new DataView(chunk);
    let id = view.getUint16(0, true);
    let stack = view.getUint16(2, true);
    let duration = view.getFloat32(4, true);
    let source = view.getUint32(8, true);
    let _status = statuses[id];
    if (id > 0) {
      status.push({
        name: _status ? _status.name : undefined,
        id,
        stack,
        duration,
        source
      });
    }
    chunk = chunk.slice(12);
  }
  return {
    hp,
    maxHp,
    shield,
    statuses: status
  };
}

function time(stamp) {
  return stamp;
}

function parseActionX(x, packet) {
  let view = new DataView(packet);
  let skill = view.getUint16(28, true);
  let count = view.getUint8(33);
  let chunk = packet.slice(42, 64 * x + 42);
  let targets = new DataView(
    packet.slice(42 + 64 * x + 6, 42 + 64 * x + 6 + 8 * x)
  );
  let actions = [];
  for (let i = 0; i < count && i < x; i++) {
    let effects = parseEffects(chunk);
    chunk = chunk.slice(64);
    let target = targets.getUint32(i * 8, true);
    actions.push({
      effects,
      target
    });
  }
  return {
    skill,
    actions: actions
  };
}

function parseTick(packet) {
  let view = new DataView(packet);
  //($target, $type, $skill, $hot_dot, $dmg, $source) = unpack("x4 H8 x24 H4 x2 H4 x2 C x3 v x2 H8", $block);
  let type = view.getUint16(0, true);
  if (TICK_TYPE[type]) {
    type = TICK_TYPE[type];
  }
  let skill = view.getUint16(4, true);
  let param = view.getUint8(8);
  let value = view.getUint32(12, true);
  let source = view.getUint32(16, true);

  if (type === "DOT") {
    type = "DOT" + param;
    if (param === 4) {
      type = "HOT";
    } else if (param === 3) {
      type = "DOT";
    }
  }

  return {
    type: `${type}`,
    skill,
    param,
    value,
    source
  };
}

function parseStatusPacket(packet) {
  // 8002000080100040f1380100f13801001027e8031027001900015f67007fa40000005f670000904153010810000000004c825f67f57f000006f805100000000018815f67f57f000050825f67f57f00000052ee9bf57f000000c3c79bf57f0000
  let view = new DataView(packet);
  let shield = view.getUint8(24);
  let hp = view.getUint32(8, true);
  let maxHp = view.getUint32(12, true);
  let count = view.getUint8(25);
  packet = packet.slice(30);
  let out = [];
  for (let i = 0; i < count; i++) {
    view = new DataView(packet);
    let id = view.getUint16(0, true);
    if (id === 0) {
      continue;
    }
    let stacks = view.getUint16(2, true);
    let duration = view.getFloat32(6, true);
    let source = view.getUint32(10, true);
    let _status = statuses[id];
    out.push({
      name: _status ? _status.name : undefined,
      id,
      stacks,
      duration,
      source
    });
    packet = packet.slice(16);
  }
  return {
    hp,
    maxHp,
    shield,
    statuses: out
  };
}

function parsePCPacket(packet) {
  let view = new DataView(packet);
  let job = view.getUint8(130);
  let textDecoder = new TextDecoder();
  let name = textDecoder.decode(packet.slice(560, 592));
  let idx = -1;
  if ((idx = name.indexOf("\0")) > -1) {
    name = name.slice(0, idx);
  }
  return {
    name,
    job
  };
}

function parseSpawnPacket(packet) {
  let view = new DataView(packet);
  let owner = view.getUint32(84, true);
  return {
    owner
  };
}

function parseObjSpawn(payload) {
  let view = new DataView(payload);
  let owner = view.getUint32(20, true);
  return {
    owner
  };
}

function parseParty(packet) {
  let view = new DataView(packet);
  let count = view.getUint8(3537);
  let pcs = [];
  for (let i = 0; i < count; i++) {
    let chunk = packet.slice(i * 440, i * 440 + 440);
    let pcView = new DataView(chunk);
    let job = pcView.getUint8(71);
    let id = pcView.getUint32(40, true);
    let textDecoder = new TextDecoder();
    let name = textDecoder.decode(chunk.slice(0, 32));
    let idx = -1;
    if (id === 0) {
      continue;
    }
    if ((idx = name.indexOf("\0")) > -1) {
      name = name.slice(0, idx);
    }
    pcs.push({
      id,
      name,
      job
    });
  }
  return pcs;
}

function parseAllianceInfo(packet) {
  // let view = new DataView(packet);
  let textDecoder = new TextDecoder();
  let pcs = [];
  for (let i = 0; i < 16; i++) {
    let chunk = packet.slice(i * 48, i * 48 + 48);
    let view = new DataView(chunk);
    let id = view.getUint32(32, true);
    if (id === 0xe0000000) continue;
    let name = textDecoder.decode(chunk.slice(0, 32));
    let idx = -1;
    if ((idx = name.indexOf("\0")) > -1) {
      name = name.slice(0, idx);
    }
    let job = view.getUint8(44);
    pcs.push({
      id,
      name,
      job
    });
  }
  return pcs;
}

module.exports.parsePackets = function(packets) {
  let events = [];
  packets.forEach(packet => {
    if (!PTYPE[packet.ptype]) return;
    let event = PTYPE[packet.ptype];
    switch (event) {
      case "STATUS_LIST": {
        let status = parseStatusList(packet.payload);
        events.push({
          type: EventTypes.STATUS_LIST,
          target: packet.source,
          status
        });
        break;
      }
      case "ZONE_IN": {
        events.push({
          type: EventTypes.ZONE_IN,
          time: packet.time
        });
        break;
      }
      case "STATUS_SYNC": {
        events.push({
          type: EventTypes.STATUS_SYNC,
          time: packet.time
        });
        break;
      }
      case "ALLIANCE_INFO": {
        let pcs = parseAllianceInfo(packet.payload);
        events.push({
          type: EventTypes.ALLIANCE_INFO,
          time: packet.time,
          pcs: pcs
        });
        break;
      }
      case "PARTY_INFO": {
        let pcs = parseParty(packet.payload);
        events.push({
          type: EventTypes.PARTY_INFO,
          time: packet.time,
          pcs
        });
        break;
      }
      case "NPC_SPAWN": {
        let { owner } = parseSpawnPacket(packet.payload);
        events.push({
          type: EventTypes.NPC_SPAWN,
          source: packet.source,
          owner
        });
        break;
      }
      case "PC": {
        let actorInfo = parsePCPacket(packet.payload);
        events.push({
          type: EventTypes.PC,
          source: packet.source,
          actorInfo
        });
        break;
      }
      case "OBJ_SPAWN": {
        let objSpawn = parseObjSpawn(packet.payload);
        events.push({
          type: EventTypes.OBJ_SPAWN,
          source: packet.source,
          actorInfo: objSpawn
        });
        break;
      }
      case "STATUS": {
        let status = parseStatusPacket(packet.payload);
        events.push({
          target: packet.source,
          type: EventTypes.STATUS_STATS,
          shield: status.shield,
          hp: status.hp,
          maxHp: status.maxHp
        });
        status.statuses.forEach(status => {
          events.push({
            type: EventTypes.STATUS,
            status: status,
            target: packet.source,
            time: time(packet.time)
          });
        });
        break;
      }
      case "ACTION": {
        let action = parseAction(packet.payload);
        events.push({
          type: EventTypes.ACTION,
          time: time(packet.time),
          source: packet.source,
          ...action
        });
        break;
      }
      case "ACTION8": {
        let action8 = parseActionX(8, packet.payload);
        action8.actions.forEach(action => {
          events.push({
            type: EventTypes.ACTION8,
            time: time(packet.time),
            skill: action8.skill,
            source: packet.source,
            ...action
          });
        });
        break;
      }
      case "ACTION16": {
        let action16 = parseActionX(16, packet.payload);
        action16.actions.forEach(action => {
          events.push({
            type: EventTypes.ACTION16,
            time: time(packet.time),
            skill: action16.skill,
            source: packet.source,
            ...action
          });
        });
        break;
      }
      case "ACTION24": {
        let action24 = parseActionX(24, packet.payload);
        action24.actions.forEach(action => {
          events.push({
            type: EventTypes.ACTION24,
            time: time(packet.time),
            source: packet.source,
            skill: action24.skill,
            ...action
          });
        });
        break;
      }
      case "CASTING": {
        let cast = parseCasting(packet.payload);
        events.push({
          type: EventTypes.CASTING,
          time: time(packet.time),
          ...cast,
          source: packet.source
        });
        break;
      }
      case "TICK": {
        let tick = parseTick(packet.payload);
        events.push({
          ...tick,
          type: EventTypes.TICK,
          tickType: tick.type,
          time: time(packet.time),
          target: packet.source
        });
        break;
      }
      default:
        break;
    }
  });
  return events;
};

function getBigUint64(view, position, littleEndian = false) {
  if ("getBigUint64" in DataView.prototype) {
    return view.getBigUint64(position, littleEndian);
  } else {
    const lsb = BigInt(
      view.getUint32(position + (littleEndian ? 0 : 4), littleEndian)
    );
    const gsb = BigInt(
      view.getUint32(position + (littleEndian ? 4 : 0), littleEndian)
    );
    return lsb + BigInt(4294967296) * gsb;
  }
}

module.exports.unpackPacket = function(rawPacket, _time = 0) {
  if (rawPacket instanceof Buffer) {
    rawPacket = rawPacket.buffer.slice(
      rawPacket.byteOffset,
      rawPacket.byteOffset + rawPacket.byteLength
    );
  }
  let view = new DataView(rawPacket);
  let size = view.getUint32(0, true);
  let source = view.getUint32(4, true);
  let target = view.getUint32(8, true);
  let ptype = view.getUint32(18, false).toString(16);
  let time = _time;
  if (time === 0) {
    time = view.getUint32(24, true) * 1000;
  }
  ptype = ("00000000" + ptype).slice(-8);
  let payload = new Uint8Array(rawPacket.slice(32)).buffer;
  return {
    time,
    size,
    source,
    target,
    ptype,
    payload
  };
};
