import * as THREE from 'three';
const inverse=new THREE.Matrix4(), start=new THREE.Vector3(), end=new THREE.Vector3(), scale=new THREE.Vector3();
const bounds=new THREE.Box3(), delta=new THREE.Vector3(), ray=new THREE.Ray(), hit=new THREE.Vector3();
// Individual mesh-local bounds preserve the empty spaces between tower pieces.
// Three swept body/wing samples avoid broad parent boxes that fill those spaces.
export function sweptSolidContact(root, shipFrom, shipTo, obstacleDelta){
  root.updateWorldMatrix(true,true);
  let contact=false;
  root.traverse(mesh=>{
    if(contact||!mesh.isMesh||!mesh.visible||!mesh.geometry)return;
    mesh.geometry.computeBoundingBox();
    inverse.copy(mesh.matrixWorld).invert();mesh.getWorldScale(scale);
    bounds.copy(mesh.geometry.boundingBox);
    const margin=new THREE.Vector3(.38/Math.abs(scale.x),.32/Math.abs(scale.y),.5/Math.abs(scale.z));
    bounds.expandByVector(margin);
    for(const wing of [-.85,0,.85]){
      start.copy(shipFrom).add(obstacleDelta);start.x+=wing;start.applyMatrix4(inverse);
      end.copy(shipTo);end.x+=wing;end.applyMatrix4(inverse);
      if(bounds.containsPoint(start)||bounds.containsPoint(end)){contact=true;break;}
      delta.subVectors(end,start);const length=delta.length();
      if(length<1e-7)continue;
      ray.set(start,delta.multiplyScalar(1/length));
      if(ray.intersectBox(bounds,hit)&&hit.distanceToSquared(start)<=length*length){contact=true;break;}
    }
  });
  return contact;
}
