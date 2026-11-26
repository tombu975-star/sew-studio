import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyOverheadTotal, overheadRecoveryRatePercent, orderOverheadMargin, orderTrueCost, suggestedPriceFor, markupAchieved, defaultMarkupPercent } from "../src/lib/format.ts";
import { cleanImageRef } from "../src/lib/image-ref.ts";

const settings = { overheadItems: [{amount: 300}, {amount: 200}], overheadAmount: 900, overheadRecoveryBasis: 2500 };
test("itemised overhead takes precedence and recovery excludes labour", () => {
  assert.equal(monthlyOverheadTotal(settings), 500);
  assert.equal(overheadRecoveryRatePercent(settings), 20);
  assert.equal(orderOverheadMargin({fabricCost: 250, labourCost: 180}, settings), 50);
  assert.equal(orderTrueCost({fabricCost: 250, labourCost: 180, otherCost: 70}, settings), 550);
});
test("legacy flat overhead and missing settings remain supported", () => {
  assert.equal(orderTrueCost({fabricCost: 100}, {overheadAmount: 40}), 140);
  assert.equal(orderTrueCost({fabricCost: 100}, null), 100);
});
test("markup is distinct from profit margin and zero cost is undefined", () => {
  assert.equal(suggestedPriceFor(500, 30), 650);
  assert.ok(Math.abs(markupAchieved(650, 500)-30)<1e-9);
  assert.equal(markupAchieved(100, 0), null);
  assert.equal(defaultMarkupPercent({defaultMarkupPercent: 0}), 0);
  assert.equal(defaultMarkupPercent(undefined), 30);
});
test("image references reject executable schemes and invalid upload paths", () => {
  assert.equal(cleanImageRef(" javascript:alert(1) "), undefined);
  assert.equal(cleanImageRef("data:image/svg+xml,test"), undefined);
  assert.equal(cleanImageRef("/api/files/not-a-uuid"), undefined);
  assert.equal(cleanImageRef(" "), null);
  assert.equal(cleanImageRef(" https://example.com/photo.jpg "), "https://example.com/photo.jpg");
  assert.equal(cleanImageRef("/api/files/12345678-1234-1234-1234-123456789abc"), "/api/files/12345678-1234-1234-1234-123456789abc");
});

test("revenue allocation recovers overhead on client-supplied fabric",()=>{
 const cfg={overheadItems:[{amount:2000}],overheadAllocationMethod:"revenue",overheadRevenueBasis:20000,defaultMarkupPercent:30};
 const order={fabricCost:0,labourCost:400,otherCost:100,markupPercent:30};
 assert.equal(overheadRecoveryRatePercent(cfg),10);
 assert.equal(orderOverheadMargin(order,cfg),65);
 assert.equal(orderTrueCost(order,cfg),565);
 assert.equal(orderOverheadMargin({...order,markupPercent:0},cfg),50);
 assert.equal(orderOverheadMargin(order,{...cfg,overheadRevenueBasis:0}),0);
});
test("saved overhead including zero overrides later settings",()=>{
 const order={fabricCost:0,labourCost:400,otherCost:100,overheadAmountSnapshot:65};
 assert.equal(orderTrueCost(order,{...settings,overheadAllocationMethod:"revenue",overheadRevenueBasis:100}),565);
 assert.equal(orderTrueCost({...order,overheadAmountSnapshot:0},settings),500);
});
