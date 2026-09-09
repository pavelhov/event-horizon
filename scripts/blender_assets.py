"""Reproducible Event Horizon hero assets. Run: blender -b --python scripts/blender_assets.py"""
import bpy
import bmesh
import math
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets')
os.makedirs(OUT, exist_ok=True)

def clean():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, roughness=0.4, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    return m

def mesh(name, verts, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def box(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        b = o.modifiers.new('Precision chamfer', 'BEVEL')
        b.width = bevel
        b.segments = 1
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=b.name)
    return o

def export(name):
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(obj.data)
            bm.free()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, name + '.blend'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_yup=True)

clean()
graphite = mat('Obsidian titanium', (0.045, 0.075, 0.10), .78, .27)
ivory = mat('Ceramic ivory', (.74, .83, .86), .5, .28)
glass = mat('Polarized cockpit', (.015, .17, .22), .8, .12)
cyan = mat('Ion cyan', (.035, .8, 1), .25, .25, 6)
orange = mat('Navigation amber', (1, .25, .035), .2, .3, 4)

# Blender +Y is the nose; glTF export converts this to Three.js -Z.
mesh('Spear fuselage', [(-.34,-1.15,-.13),(.34,-1.15,-.13),(.24,.5,-.09),(0,1.65,0),(-.24,.5,-.09),(-.25,-1.05,.15),(.25,-1.05,.15),(.17,.42,.17),(0,1.65,0),(-.17,.42,.17)], [(0,1,2,3,4),(5,9,8,7,6),(0,5,6,1),(1,6,7,2),(2,7,8,3),(4,3,8,9),(0,4,9,5)], graphite)
mesh('Cockpit canopy', [(-.17,-.38,.16),(.17,-.38,.16),(.13,.48,.16),(0,.89,.095),(-.13,.48,.16),(-.11,-.25,.34),(.11,-.25,.34),(0,.5,.29)], [(0,1,6,5),(1,2,7,6),(2,3,7),(3,4,7),(4,0,5,7),(5,6,7)], glass)
for side in [-1,1]:
    def v(x,y,z): return (side*x,y,z)
    verts = [v(.23,.55,.06),v(1.28,-.90,-.03),v(1.2,-1.17,-.06),v(.20,-.78,-.04),v(.23,.5,.13),v(1.28,-.90,.035),v(1.2,-1.17,.005),v(.20,-.78,.08)]
    mesh('Ceramic swept wing ' + str(side), verts, [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)], ivory)
    box('Engine titanium shroud', (side*.65,-.80,.04), (.23,.76,.23), graphite, .065)
    box('Engine ion aperture', (side*.65,-1.191,.04), (.14,.025,.14), cyan, .02)
    mesh('Ion fin', [v(.68,-1.0,.1),v(.68,-.2,.1),v(.71,-.84,.47),v(.74,-1,.1)], [(0,1,2),(1,3,2),(0,2,3),(0,3,1)], graphite)
    box('Wingtip running light', (side*1.21,-1.015,.043), (.075,.18,.022), cyan)
    box('Nose tracer', (side*.105,.72,.125), (.021,.41,.016), cyan)
box('Aft central reactor', (0,-1.16,.015), (.26,.035,.14), orange, .02)
export('ship')

clean()
rock = mat('Alien alloy', (.12,.15,.19), .75, .45)
edge = mat('Oxidized alloy', (.22,.27,.30), .62, .52)
glow = mat('Ancient cyan circuits', (.015,.65,.83), .1,.4,3)
random.seed(8)
for i in range(5):
    angle = i*math.tau/5
    height = random.uniform(2.8,5.8)
    x,y = math.cos(angle)*.8,math.sin(angle)*.8
    pillar = box('Fractured obelisk %d'%i,(x,y,height/2),(.48,.60,height), rock,.10)
    pillar.rotation_euler[0] = random.uniform(-.12,.12)
    pillar.rotation_euler[1] = random.uniform(-.12,.12)
    box('Vertical circuit %d'%i,(x,y-.306,height*.51),(.045,.015,height*.75),glow)
    shard = box('Suspended crown %d'%i,(x*1.3,y*1.3,height+.65),(.38,.43,.8),edge,.05)
    shard.rotation_euler = (.12,-.24,angle)
box('Foundation', (0,0,.08),(2.5,2.2,.24),rock,.15)
export('ruin')
print('BLENDER_ASSETS_COMPLETE:', OUT)
