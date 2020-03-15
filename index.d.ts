declare module "xiv-packet" {
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
    STATUS_STATS = "STATUS_STATS",
    CRAFTING_STATUS = "CRAFTING_STATUS",
    CRAFTING_ACTION = "CRAFTING_ACTION"
  }

  interface XivEventBase {
    type: EventTypes;
    time?: number;
  }

  interface Status {
    name: string;
    id: number;
    stace: number;
    duration: number;
    source: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    shield: number;
    statuses: Status[];
  }

  interface Effect {
    flags: number;
    effectType: number;
    effectTypeName: string;
    severity: number;
    param: number;
    bonus: number;
    mod: number;
    value: number;
  }

  interface StatusListEvent extends XivEventBase {
    type: EventTypes.STATUS_LIST;
    status: Status;
    target: number;
  }

  interface StatusEvent extends XivEventBase {
    type: EventTypes.STATUS;
    status: Status;
    target: number;
  }

  interface ActionEventBase extends XivEventBase {
    source: number;
    time: number;
    skill: number;
    effects: Effect[];
    target: number;
  }

  interface ActionEvent extends ActionEventBase {
    type: EventTypes.ACTION;
  }

  interface Action8Event extends ActionEventBase {
    type: EventTypes.ACTION8;
  }

  interface Action16Event extends ActionEventBase {
    type: EventTypes.ACTION16;
  }

  interface Action24Event extends ActionEventBase {
    type: EventTypes.ACTION24;
  }

  interface ZoneInEvent extends XivEventBase {
    type: EventTypes.ZONE_IN;
  }

  interface StatusSyncEvent extends XivEventBase {
    type: EventTypes.STATUS_SYNC;
  }

  interface ActorInfo {
    id: number;
    name: string;
  }

  interface Pc extends ActorInfo {
    job: string;
  }

  interface AllianceInfoEvent extends XivEventBase {
    type: EventTypes.ALLIANCE_INFO;
    pcs: Pc[];
  }

  interface PCEvent extends XivEventBase {
    type: EventTypes.PC;
    source: number;
    actorInfo: Pc;
  }

  interface PartyInfoEvent extends XivEventBase {
    type: EventTypes.PARTY_INFO;
    pcs: Pc[];
  }

  interface NpcSpawnEvent extends XivEventBase {
    type: EventTypes.NPC_SPAWN;
    source: number;
    owner: number;
  }

  interface ObjSpawnEvent extends XivEventBase {
    type: EventTypes.OBJ_SPAWN;
    source: number;
    actorInfo: ActorInfo;
  }

  interface CastingEvent extends XivEventBase {
    type: EventTypes.CASTING;
    source: number;
    skill: number;
    castTime: number;
    target: number;
  }

  interface StatusStatsEvent extends XivEventBase {
    type: EventTypes.STATUS_STATS;
    shield: number;
    hp: number;
    maxHp: number;
  }

  interface TickEvent extends XivEventBase {
    type: EventTypes.TICK;
    target: number;
    tickType: string;
  }

  interface CraftingStatusEvent extends XivEventBase {
    type: EventTypes.CRAFTING_STATUS;
    status: string;
  }

  interface CraftingActionEvent extends XivEventBase {
    type: EventTypes.CRAFTING_ACTION;
    action: number;
    progress: number;
    progressInc: number;
    quality: number;
    qualityInc: number;
    durability: number;
    nextCondition: number;
    condition: number;
    flag: number;
  }

  type XivEvent =
    | StatusListEvent
    | StatusEvent
    | ActionEvent
    | Action8Event
    | Action16Event
    | Action24Event
    | ZoneInEvent
    | StatusSyncEvent
    | AllianceInfoEvent
    | PCEvent
    | PartyInfoEvent
    | NpcSpawnEvent
    | ObjSpawnEvent
    | CastingEvent
    | StatusStatsEvent
    | TickEvent;

  interface XivPacket {
    time: number;
    size: number;
    source: number;
    target: number;
    ptype: string;
    payload: ArrayBuffer;
  }
  function unpackPacket(rawPacket: ArrayBuffer | any): XivPacket;
  function parsePackets(packets: XivPacket[]): XivEvent[];
}
