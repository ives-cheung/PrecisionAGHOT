// A daily's front-page picture comes from the item its lead is about: the editors' lead matched to an
// item by title, never simply the first highlight.
import "./setup.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReportCitation } from "@aihot/contracts/site";
import { leadItemOf } from "@aihot/backend/publication/reports";

const cite = (itemId: string, title: string) => ({ itemId, title }) as ReportCitation;
const trial = cite("a", "田间试验显示变量喷施系统在玉米地减少 35% 除草剂用量");
const recall = cite("b", "农机厂商暂停自动转向系统的交付与安装，披露失去卫星信号及转向控制异常等安全事件");

test("an editors' lead is matched to the item it is written about", () => {
  assert.equal(leadItemOf("农机厂商暂停自动转向系统交付与安装，披露转向控制安全事件", [trial, recall], [trial, recall])?.itemId, "b");
});

test("a lead that matches no item clearly has no item", () => {
  assert.equal(leadItemOf("多家公司获农业项目融资，产业投资加速", [trial], [trial, recall]), undefined);
});

test("without an editors' lead the first highlight leads", () => {
  assert.equal(leadItemOf(undefined, [trial], [recall, trial])?.itemId, "a");
});
