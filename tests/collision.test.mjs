import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sweptSolidContact } from '../src/collision.js';
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const box=(x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2));mesh.position.set(x,y,z);return mesh;};
test('approaching obstacle does not damage before contact',()=>{
  assert.equal(sweptSolidContact(box(0,0,-6),v(),v(),v(0,0,6)),false);
});
test('boosted obstacle crossing cannot tunnel through ship',()=>{
  assert.equal(sweptSolidContact(box(0,0,12),v(),v(),v(0,0,24)),true);
});
test('moving away preserves contact at start of frame',()=>{
  assert.equal(sweptSolidContact(box(0,0,4),v(),v(),v(0,0,4)),true);
});
test('fast mouse sweep detects obstacles between endpoints',()=>{
  assert.equal(sweptSolidContact(box(),v(-5),v(5),v()),true);
});
test('wings touch solid geometry but distant shapes stay safe',()=>{
  assert.equal(sweptSolidContact(box(1.8),v(),v(),v()),true);
  assert.equal(sweptSolidContact(box(4),v(),v(),v()),false);
});
test('gaps between pieces of orbital ruins remain flyable',()=>{
  const root=new THREE.Group();root.add(box(-4),box(4));
  assert.equal(sweptSolidContact(root,v(0,0,-10),v(0,0,10),v()),false);
});
