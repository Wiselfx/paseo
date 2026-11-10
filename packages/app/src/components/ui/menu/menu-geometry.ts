/** Shared geometry for menu rows and controls that align with them. */
import { bySizing, TOUCH_TARGET } from "@/components/ui/control-geometry";

/**
 * A menu row is 32px where a pointer aims and a full touch target where a thumb
 * lands. Both presentations resolve the same value, so a list never changes
 * pitch between the popover and the sheet.
 */
export const MENU_ITEM_HEIGHT = bySizing({ touch: TOUCH_TARGET, pointer: 32 });
