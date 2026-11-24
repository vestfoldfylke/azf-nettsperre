import type { BlockType } from "../../types/block.js";
import { validBlockTypes } from "../config.js";

export const isValidBlockType = (value: string): value is BlockType => (validBlockTypes as readonly string[]).includes(value);
