import { Image } from "react-native";

// Bundle the crab's sheets through Metro so they resolve to a runtime source.
const SHEETS = {
  idle: require("./assets/crab/idle.png"),
  "idle-look": require("./assets/crab/idle-look.png"),
  "idle-wave": require("./assets/crab/idle-wave.png"),
  "idle-laptop": require("./assets/crab/idle-laptop.png"),
  thinking: require("./assets/crab/thinking.png"),
  typing: require("./assets/crab/typing.png"),
  music: require("./assets/crab/music.png"),
  conducting: require("./assets/crab/conducting.png"),
  building: require("./assets/crab/building.png"),
  error: require("./assets/crab/error.png"),
  happy: require("./assets/crab/happy.png"),
  notification: require("./assets/crab/notification.png"),
  compacting: require("./assets/crab/compacting.png"),
  sleeping: require("./assets/crab/sleeping.png"),
  waking: require("./assets/crab/waking.png"),
  "poke-left": require("./assets/crab/poke-left.png"),
  "poke-right": require("./assets/crab/poke-right.png"),
  tickle: require("./assets/crab/tickle.png"),
  drag: require("./assets/crab/drag.png"),
} as const;

export function crabSheetSource(animation: string): { uri: string } | number {
  const resolved = SHEETS[animation as keyof typeof SHEETS];
  return resolved !== undefined ? resolved : SHEETS.idle;
}

export { Image };
