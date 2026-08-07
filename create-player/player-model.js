// Football Legacy Create Player v3
// Player geometry, locked SculptGL head, hair construction, kits and limbs are taken from the current match engine.
(function(){
  'use strict';
  const CONFIG={weather:'clear',homeKit:'stripes',awayKit:'sash'};
  const MATCH_YEAR=2008;
  const COL={you:1,opp:2};
  let fabricBumpTexture=null;
  const crestTextureCache={},sponsorTextureCache={},faceTextureCache={};
  let PREVIEW_STYLE={pattern:'stripes',primary:'#a72d3b',secondary:'#f2e9d8',shorts:'#172842',socks:'#f2e9d8',number:'#ffffff',boot:'#111318'};

  function hexNumber(value,fallback){
    const raw=String(value||fallback||'#000000').replace('#','');
    return Number.parseInt(raw.length===3?raw.split('').map(c=>c+c).join(''):raw,16);
  }
  function randomAppearance(){return {skinIndex:2,hairIndex:1,hairStyle:1,faceIndex:1,eyeIndex:0,browIndex:1,beardStyle:0,noseIndex:1,jawIndex:1,chinIndex:1,earIndex:1,bodyIndex:0,hairlineIndex:1,heightIndex:3,sleeveIndex:0};}

  function makeFabricBump(){
    if(fabricBumpTexture)return fabricBumpTexture;
    const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');g.fillStyle='#777';g.fillRect(0,0,128,128);
    g.globalAlpha=.48;for(let y=0;y<128;y+=3){g.strokeStyle=y%6?'#898989':'#686868';g.lineWidth=.7;g.beginPath();g.moveTo(0,y);g.lineTo(128,y+1);g.stroke();}
    for(let x=0;x<128;x+=4){g.strokeStyle=x%8?'#808080':'#6d6d6d';g.lineWidth=.55;g.beginPath();g.moveTo(x,0);g.lineTo(x+1,128);g.stroke();}g.globalAlpha=1;
    fabricBumpTexture=new THREE.CanvasTexture(c);fabricBumpTexture.wrapS=fabricBumpTexture.wrapT=THREE.RepeatWrapping;fabricBumpTexture.repeat.set(3,3);return fabricBumpTexture;
  }

  function makeKitTexture(kind){
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    const p=PREVIEW_STYLE.primary,s=PREVIEW_STYLE.secondary,pattern=PREVIEW_STYLE.pattern;
    g.fillStyle=p;g.fillRect(0,0,128,128);
    g.fillStyle=s;
    if(pattern==='stripes'){for(let x=0;x<128;x+=32)g.fillRect(x,0,15,128);}
    else if(pattern==='hoops'){for(let y=8;y<128;y+=34)g.fillRect(0,y,128,15);}
    else if(pattern==='halves'){g.fillRect(64,0,64,128);}
    else if(pattern==='quarters'){g.fillRect(64,0,64,64);g.fillRect(0,64,64,64);}
    else if(pattern==='sash'){g.save();g.translate(64,64);g.rotate(-.61);g.fillRect(-18,-110,36,220);g.restore();}
    g.fillStyle='rgba(255,255,255,.13)';g.fillRect(0,0,128,5);
    const t=new THREE.CanvasTexture(c);t.anisotropy=4;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
  }

  function makeCrestTexture(kind){
    const key=[PREVIEW_STYLE.primary,PREVIEW_STYLE.secondary].join('|');if(crestTextureCache[key])return crestTextureCache[key];
    const c=document.createElement('canvas');c.width=128;c.height=144;const g=c.getContext('2d');g.clearRect(0,0,128,144);
    g.save();g.translate(64,8);g.beginPath();g.moveTo(-41,7);g.lineTo(41,7);g.lineTo(35,82);g.quadraticCurveTo(16,117,0,128);g.quadraticCurveTo(-16,117,-35,82);g.closePath();g.fillStyle=PREVIEW_STYLE.primary;g.fill();g.lineWidth=7;g.strokeStyle=PREVIEW_STYLE.secondary;g.stroke();g.restore();
    g.fillStyle=PREVIEW_STYLE.secondary;g.font='900 27px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('FL',64,76);
    const t=new THREE.CanvasTexture(c);t.anisotropy=8;crestTextureCache[key]=t;return t;
  }
  function makeSponsorTexture(kind){
    const key=PREVIEW_STYLE.secondary;if(sponsorTextureCache[key])return sponsorTextureCache[key];
    const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.clearRect(0,0,256,64);g.fillStyle=PREVIEW_STYLE.secondary;g.fillRect(3,8,250,48);g.fillStyle='#14263b';g.font='900 29px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('FOOTBALL LEGACY',128,33);const t=new THREE.CanvasTexture(c);t.anisotropy=8;sponsorTextureCache[key]=t;return t;
  }

  function numberTexture(number,kind){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.font='900 42px Arial';g.textAlign='center';g.textBaseline='middle';g.lineWidth=6;g.strokeStyle=kind==='home'?'#8e2525':'#06182c';g.strokeText(String(number),32,34);g.fillStyle='#f7f1e7';g.fillText(String(number),32,34);return new THREE.CanvasTexture(c);}

  function faceTexture(a){
    const key=[a.skinIndex,a.hairIndex,a.faceIndex,a.eyeIndex,a.browIndex,a.beardStyle,a.noseIndex,a.jawIndex,a.chinIndex].join('-');
    if(faceTextureCache[key])return faceTextureCache[key];
    const c=document.createElement('canvas'); c.width=256; c.height=288;
    const g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height);
    const dark=a.skinIndex>5;
    const line=dark?'rgba(30,19,13,.48)':'rgba(82,53,35,.42)';
    const socket=dark?'rgba(18,11,8,.18)':'rgba(66,42,28,.14)';
    const blush=dark?'rgba(126,82,53,.11)':'rgba(214,153,111,.10)';
    const lip=dark?'rgba(121,74,73,.64)':'rgba(154,88,86,.62)';
    const glow=(x,y,rx,ry,col)=>{const gr=g.createRadialGradient(x,y,1,x,y,Math.max(rx,ry));gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.translate(x,y);g.scale(rx/ry,1);g.fillStyle=gr;g.beginPath();g.arc(0,0,ry,0,Math.PI*2);g.fill();g.restore();};
    glow(76,160,56,48,blush); glow(180,160,56,48,blush);
    const eyeY=122+((a.eyeIndex||0)%3-1)*2, gap=38+((a.faceIndex||0)%3-1)*2, tilt=[-.06,.02,.08,-.03,.10][(a.browIndex||0)%5];
    [-1,1].forEach(side=>{const cx=128+side*gap; g.fillStyle=socket; g.beginPath(); g.ellipse(cx,eyeY,17,8,0,0,Math.PI*2); g.fill(); g.strokeStyle=line; g.lineWidth=2.0; g.lineCap='round'; g.beginPath(); g.moveTo(cx-13,eyeY-10); g.quadraticCurveTo(cx,eyeY-15+tilt*8,cx+13,eyeY-9-tilt*5); g.stroke();});
    g.strokeStyle=socket; g.lineWidth=2.4; g.lineCap='round'; g.beginPath(); g.moveTo(128,108); g.quadraticCurveTo(119,146,128,168); g.stroke();
    g.fillStyle=socket; g.beginPath(); g.ellipse(121,167,4.6,1.6,0,0,Math.PI*2); g.fill(); g.beginPath(); g.ellipse(135,167,4.6,1.6,0,0,Math.PI*2); g.fill();
    const mouthY=206+((a.faceIndex||0)%3-1)*2; g.fillStyle=lip; g.beginPath(); g.moveTo(106,mouthY); g.quadraticCurveTo(118,mouthY-4,128,mouthY-1); g.quadraticCurveTo(138,mouthY-4,150,mouthY); g.quadraticCurveTo(138,mouthY+4,128,mouthY+5); g.quadraticCurveTo(118,mouthY+4,106,mouthY); g.closePath(); g.fill();
    g.strokeStyle='rgba(95,54,54,.40)'; g.lineWidth=1.7; g.beginPath(); g.moveTo(109,mouthY+1); g.quadraticCurveTo(128,mouthY+3,147,mouthY+1); g.stroke();
    if(a.beardStyle===1||a.beardStyle===4){ g.fillStyle=dark?'rgba(19,13,10,.12)':'rgba(49,33,24,.08)'; for(let i=0;i<48;i++){const x=76+Math.random()*104,y=184+Math.random()*50;if(Math.abs(x-128)<55-(y-184)*.16)g.fillRect(x,y,1.0,1.0);} }
    const t=new THREE.CanvasTexture(c); t.anisotropy=8; t.minFilter=THREE.LinearMipmapLinearFilter||THREE.LinearMipMapLinearFilter; t.magFilter=THREE.LinearFilter;
    faceTextureCache[key]=t; return t;
  }

  function playerMesh(spec={}){
    if(typeof spec==='number')spec={kind:spec===COL.you?'home':spec===COL.opp?'away':'official'};
    const kind=spec.kind||'home',number=spec.number||0,official=kind==='official'||kind==='assistant',a={bodyIndex:0,heightIndex:3,sleeveIndex:0,...(spec.appearance||randomAppearance())},grp=new THREE.Group();
    grp.rotation.order='YXZ';
    const CAST=o=>(o.castShadow=true,o.receiveShadow=true,o);
    const skinTones=[0xf3cfad,0xe8bb92,0xd69e70,0xc18250,0xa9653d,0x875033,0x673c27,0x48291d];
    const hairCols=[0x18120f,0x2b1c14,0x4d2e1b,0x76502c,0xa17e52,0xc0af91,0x6f6f70];
    const skinCol=skinTones[a.skinIndex%skinTones.length], hairCol=hairCols[(a.hairIndex||0)%hairCols.length];
    const fabric=makeFabricBump();
    const skin=new THREE.MeshStandardMaterial({color:skinCol,roughness:.70,metalness:0,envMapIntensity:.54,flatShading:false});
    const kit=new THREE.MeshStandardMaterial({map:makeKitTexture(kind),bumpMap:fabric,bumpScale:.075,roughness:.78,metalness:0,envMapIntensity:.48,flatShading:false});
    const shortColor=hexNumber(PREVIEW_STYLE.shorts,'#172842');
    const shorts=new THREE.MeshStandardMaterial({color:shortColor,bumpMap:fabric,bumpScale:.055,roughness:.82,metalness:0,envMapIntensity:.42,flatShading:false});
    const sockColor=hexNumber(PREVIEW_STYLE.socks,'#f3eee4');
    const sock=new THREE.MeshStandardMaterial({color:sockColor,bumpMap:fabric,bumpScale:.035,roughness:.86,metalness:0,envMapIntensity:.35,flatShading:false});
    const bootCol=hexNumber(PREVIEW_STYLE.boot,'#101114');
    const boot=new THREE.MeshStandardMaterial({color:bootCol,roughness:.34,metalness:.07,envMapIntensity:.82,flatShading:false});
    const trimColour=hexNumber(PREVIEW_STYLE.secondary,'#f1ece2');
    const trimMat=new THREE.MeshStandardMaterial({color:trimColour,roughness:.88,metalness:0,flatShading:false});
    const archetypes=[
      {name:'average-athletic',shoulder:1.00,chest:1.00,waist:.96,hip:1.00,depth:1.00,limb:1.00,thigh:1.00,calf:1.00,armLength:1.00,legLength:1.00,stance:1.00,posture:.018,stride:1.00,armSwing:1.00},
      {name:'powerful',shoulder:1.10,chest:1.08,waist:1.02,hip:1.06,depth:1.08,limb:1.08,thigh:1.11,calf:1.08,armLength:.98,legLength:.98,stance:1.08,posture:.035,stride:.94,armSwing:.94},
      {name:'lean',shoulder:.96,chest:.94,waist:.90,hip:.93,depth:.92,limb:.90,thigh:.92,calf:.90,armLength:1.04,legLength:1.04,stance:.94,posture:.012,stride:1.07,armSwing:1.08},
      {name:'short-stocky',shoulder:1.08,chest:1.07,waist:1.05,hip:1.09,depth:1.09,limb:1.07,thigh:1.12,calf:1.06,armLength:.95,legLength:.95,stance:1.10,posture:.045,stride:.91,armSwing:.91},
      {name:'tall-slender',shoulder:.99,chest:.96,waist:.92,hip:.94,depth:.94,limb:.93,thigh:.94,calf:.93,armLength:1.07,legLength:1.08,stance:.98,posture:.010,stride:1.10,armSwing:1.06}
    ];
    const archetype=archetypes[a.bodyIndex%archetypes.length],bodyD=archetype.depth,legLift=(archetype.legLength-1)*17;

    // Shared rounded low-poly forms: richer silhouettes without multiplying geometry per player.
    if(!playerMesh._athleticBodyGeo){
      const lathe=points=>new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),14);
      playerMesh._athleticBodyGeo={
        torso:lathe([[3.82,-7.85],[4.16,-7.25],[4.38,-5.75],[4.55,-3.60],[4.86,-.80],[5.38,2.80],[5.82,5.10],[5.70,6.35],[4.72,7.18],[2.95,7.82]]),
        shirtHem:lathe([[4.18,-1.20],[4.46,-.65],[4.58,.42],[4.38,1.18]]),
        pelvis:lathe([[4.12,-3.10],[4.55,-2.55],[4.86,-.45],[4.74,1.70],[4.28,3.05]]),
        shortsLeg:lathe([[1.48,-2.18],[1.66,-1.72],[1.78,.10],[1.66,1.78],[1.46,2.15]]),
        thigh:lathe([[1.06,-5.15],[1.15,-3.95],[1.34,-1.30],[1.52,1.95],[1.47,4.05],[1.31,5.15]]),
        calf:lathe([[.72,-5.20],[.82,-4.15],[1.04,-2.05],[1.22,.65],[1.16,2.65],[.98,5.20]]),
        upperArm:lathe([[.68,-4.50],[.76,-3.42],[.91,-1.40],[1.04,1.75],[1.00,3.55],[.90,4.50]]),
        forearm:lathe([[.58,-4.30],[.66,-3.15],[.78,-.60],[.88,2.25],[.80,4.30]]),
        sleeve:lathe([[1.02,-2.30],[1.17,-1.42],[1.34,.42],[1.28,1.62],[1.10,2.30]]),
        waist:new THREE.CylinderGeometry(4.35,4.62,1.24,14),
        chest:new THREE.CylinderGeometry(5.42,5.06,3.45,14,1,true,Math.PI-.68,1.36),
        bootUpper:new THREE.SphereGeometry(1,10,7),
        bootToe:new THREE.SphereGeometry(1,10,6),
        bootHeel:new THREE.SphereGeometry(1,9,6),
        sole:new THREE.BoxGeometry(2.78,.20,6.22),
        tongue:new THREE.BoxGeometry(1.08,.16,1.72),
        lace:new THREE.CylinderGeometry(.042,.042,1.00,6),
        palm:new THREE.SphereGeometry(1,9,7),
        fingers:new THREE.BoxGeometry(.92,1.38,.56),
        thumb:new THREE.SphereGeometry(1,7,5)
      };
    }
    const bodyGeo=playerMesh._athleticBodyGeo;

    const body=new THREE.Group();body.position.y=legLift;grp.add(body);
    const pelvis=new THREE.Group();body.add(pelvis);
    const hips=CAST(new THREE.Mesh(bodyGeo.pelvis,shorts));
    hips.scale.set(archetype.hip,1,.56*bodyD);hips.position.y=25.62;pelvis.add(hips);
    const shortsHem=CAST(new THREE.Mesh(bodyGeo.shirtHem,shorts));
    shortsHem.scale.set(archetype.hip*1.01,.82,.57*bodyD);shortsHem.position.set(0,22.92,0);pelvis.add(shortsHem);

    const torsoGroup=new THREE.Group();torsoGroup.position.y=35.35;body.add(torsoGroup);
    const torso=CAST(new THREE.Mesh(bodyGeo.torso,kit));
    torso.scale.set(archetype.chest,1,.53*bodyD);torsoGroup.add(torso);
    const shirtHem=CAST(new THREE.Mesh(bodyGeo.shirtHem,kit));
    shirtHem.scale.set(archetype.waist,1,.54*bodyD);shirtHem.position.set(0,-7.40,0);torsoGroup.add(shirtHem);

    // Sloped clavicle and rounded deltoids make the kit hang from an athletic shoulder line.
    const shoulderYoke=CAST(new THREE.Mesh(new THREE.SphereGeometry(6.32,16,10),kit));
    shoulderYoke.scale.set(.98*archetype.shoulder,.23,.42*bodyD);shoulderYoke.position.set(0,6.12,.05);torsoGroup.add(shoulderYoke);
    [-1,1].forEach(side=>{
      const torsoShoulder=CAST(new THREE.Mesh(new THREE.SphereGeometry(2.16,12,9),kit));
      torsoShoulder.scale.set(1.10,.72,.96*bodyD);torsoShoulder.position.set(side*5.30*archetype.shoulder,5.10,.02);torsoShoulder.rotation.z=-side*.10;torsoGroup.add(torsoShoulder);
      const armpitBlend=CAST(new THREE.Mesh(new THREE.SphereGeometry(1.46,10,8),kit));
      armpitBlend.scale.set(.82,1.12,.92*bodyD);armpitBlend.position.set(side*4.92*archetype.shoulder,3.48,.04);torsoGroup.add(armpitBlend);
    });
    const waistPlate=CAST(new THREE.Mesh(bodyGeo.waist,shorts));
    waistPlate.scale.set(archetype.waist,1,.55*bodyD);waistPlate.position.set(0,-7.28,0);torsoGroup.add(waistPlate);
    const chest=CAST(new THREE.Mesh(bodyGeo.chest,trimMat));
    chest.scale.set(archetype.chest,1,.53*bodyD);chest.position.set(0,1.98,0);torsoGroup.add(chest);
    if(!official){
      [-1,1].forEach(side=>{const seam=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,12.0,7),trimMat));seam.position.set(side*4.82*archetype.chest,.36,-2.31*bodyD);torsoGroup.add(seam);});
      const crest=new THREE.Mesh(new THREE.PlaneGeometry(2.50,3.00),new THREE.MeshStandardMaterial({map:makeCrestTexture(kind),transparent:true,roughness:.86,side:THREE.DoubleSide}));
      crest.position.set(-2.80,1.72,-3.01*bodyD);crest.rotation.y=Math.PI;torsoGroup.add(crest);
      if(MATCH_YEAR>=1978){
        const sponsor=new THREE.Mesh(new THREE.PlaneGeometry(7.0,1.66),new THREE.MeshStandardMaterial({map:makeSponsorTexture(kind),transparent:true,roughness:.88,side:THREE.DoubleSide}));
        sponsor.position.set(.26,-1.24,-2.99*bodyD);sponsor.rotation.y=Math.PI;torsoGroup.add(sponsor);
      }
    }

    const neck=CAST(new THREE.Mesh(new THREE.CylinderGeometry(1.82,2.18,4.05,14),skin));
    neck.scale.z=.92; neck.position.y=44.85; body.add(neck);
    const neckBase=CAST(new THREE.Mesh(new THREE.SphereGeometry(2.15,12,8),skin));
    neckBase.scale.set(1.55,.48,1.05); neckBase.position.set(0,43.5,.05); body.add(neckBase);
    if(!official){const collar=CAST(new THREE.Mesh(new THREE.TorusGeometry(2.24,.34,8,22),trimMat));collar.rotation.x=Math.PI/2;collar.scale.z=.86;collar.position.set(0,42.93,-.03);body.add(collar);}

    const headGroup=new THREE.Group(); headGroup.position.y=50.6; body.add(headGroup);
    const expressionEyes=[],expressionIrises=[],expressionBrows=[],expressionBaseMouth=[];let expressionSmile=null,expressionFrown=null,expressionOpen=null;
    const headScaleX=[.97,1.00,1.05,.95,1.07,1.02][(a.faceIndex||0)%6];
    const headScaleY=[.97,1.00,1.03,1.06,.98,1.02][(a.jawIndex||0)%6];
    const headScaleZ=[.97,1.00,1.03,.98,1.05,.99][(a.chinIndex||0)%6];
    const noseScale=[.92,1.00,1.09,.90,1.14,.96][(a.noseIndex||0)%6];
    const browScale=[.94,1.00,1.08,.96,1.12,.98][(a.browIndex||0)%6];
    if(!playerMesh._sculptHeadGeom && window.createFootballLegacySculptHeadGeometry){
      playerMesh._sculptHeadGeom=window.createFootballLegacySculptHeadGeometry();
    }
    const skullGeometry=playerMesh._sculptHeadGeom||new THREE.SphereGeometry(3.1,16,12);
    const skull=CAST(new THREE.Mesh(skullGeometry,skin));
    // SculptGL faces +Z; the match-engine players face -Z. Rotation preserves the sculpt's normals.
    skull.rotation.y=Math.PI;
    skull.scale.set(headScaleX,headScaleY,headScaleZ);
    headGroup.add(skull);

    if(!official){
      if(!playerMesh._curvedFaceGeo){
        playerMesh._curvedFaceGeo=new THREE.CylinderGeometry(2.34,2.02,6.7,18,1,true,Math.PI-.63,1.26);
      }
      const facePanel=new THREE.Mesh(
        playerMesh._curvedFaceGeo,
        new THREE.MeshBasicMaterial({map:faceTexture(a),transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.92})
      );
      facePanel.scale.set(headScaleX,1.0,0.98*headScaleZ); facePanel.position.set(0,-.14,-.04); facePanel.renderOrder=3; headGroup.add(facePanel);

      const eyeWhiteMat=new THREE.MeshStandardMaterial({color:0xf5f2eb,roughness:.95,metalness:0,flatShading:false});
      const irisCols=[0x5c4632,0x35566d,0x5b7447,0x4a3a2f,0x6a6d72];
      const irisMat=new THREE.MeshStandardMaterial({color:irisCols[(a.eyeIndex||0)%irisCols.length],roughness:.92,metalness:0,flatShading:false});
      const eyeGap=1.45+(((a.faceIndex||0)%3)-1)*.08;
      const eyeY=.18+(((a.eyeIndex||0)%3)-1)*.02;
      [-1,1].forEach(side=>{
        const eyeball=CAST(new THREE.Mesh(new THREE.SphereGeometry(.26,10,8),eyeWhiteMat));
        eyeball.scale.set(1.15,1.0,.86); eyeball.position.set(side*eyeGap,eyeY,-2.38);eyeball.userData={baseX:side*eyeGap,baseY:eyeY,side}; headGroup.add(eyeball);expressionEyes.push(eyeball);
        const iris=CAST(new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),irisMat));
        iris.position.set(side*eyeGap,eyeY,-2.58);iris.userData={baseX:side*eyeGap,baseY:eyeY,side}; headGroup.add(iris);expressionIrises.push(iris);
      });
      const browMat=new THREE.MeshStandardMaterial({color:hairCol,roughness:.90,metalness:0,flatShading:false});
      [-1,1].forEach(side=>{const brow=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.10,.14,1.18,8),browMat));brow.rotation.z=Math.PI/2+side*.07;brow.position.set(side*eyeGap,eyeY+1.02,-2.60);brow.userData={baseY:eyeY+1.02,side};headGroup.add(brow);expressionBrows.push(brow);});
      const lipColor=(a.skinIndex||0)>5?0x916c6b:0xb07b76;
      const lipMat=new THREE.MeshStandardMaterial({color:lipColor,roughness:.94,metalness:0,flatShading:false});
      const upperLip=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,1.44,12,false,Math.PI*.14,Math.PI*.72),lipMat));
      upperLip.rotation.z=Math.PI/2; upperLip.position.set(0,-2.08,-2.46); headGroup.add(upperLip);
      const lowerLip=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,1.28,12,false,Math.PI*.16,Math.PI*.68),lipMat));
      lowerLip.rotation.z=Math.PI/2; lowerLip.scale.y=.92; lowerLip.position.set(0,-2.34,-2.50); headGroup.add(lowerLip);
      const mouthLine=new THREE.Mesh(
        new THREE.PlaneGeometry(1.20,.11),
        new THREE.MeshBasicMaterial({color:0x6b3c3c,transparent:true,opacity:.90,side:THREE.DoubleSide,depthWrite:false})
      );
      mouthLine.position.set(0,-2.22,-2.67); mouthLine.rotation.y=Math.PI; mouthLine.renderOrder=5; headGroup.add(mouthLine);
      const mouthShadow=new THREE.Mesh(
        new THREE.PlaneGeometry(1.55,.32),
        new THREE.MeshBasicMaterial({color:0x5b3131,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false})
      );
      mouthShadow.position.set(0,-2.26,-2.58); mouthShadow.rotation.y=Math.PI; mouthShadow.renderOrder=4; headGroup.add(mouthShadow);
      expressionBaseMouth.push(upperLip,lowerLip,mouthLine,mouthShadow);
      const expressionMat=new THREE.MeshBasicMaterial({color:0x633537,transparent:true,opacity:.96,side:THREE.DoubleSide,depthWrite:false});
      expressionSmile=new THREE.Mesh(new THREE.TorusGeometry(.64,.095,6,18,Math.PI),expressionMat.clone());expressionSmile.position.set(0,-2.18,-2.72);expressionSmile.rotation.y=Math.PI;expressionSmile.rotation.z=Math.PI;expressionSmile.renderOrder=7;expressionSmile.visible=false;headGroup.add(expressionSmile);
      expressionFrown=new THREE.Mesh(new THREE.TorusGeometry(.58,.09,6,18,Math.PI),expressionMat.clone());expressionFrown.position.set(0,-2.40,-2.72);expressionFrown.rotation.y=Math.PI;expressionFrown.renderOrder=7;expressionFrown.visible=false;headGroup.add(expressionFrown);
      expressionOpen=new THREE.Mesh(new THREE.CircleGeometry(.43,14),new THREE.MeshBasicMaterial({color:0x542b31,transparent:true,opacity:.94,side:THREE.DoubleSide,depthWrite:false}));expressionOpen.scale.set(.82,1.0,1);expressionOpen.position.set(0,-2.28,-2.73);expressionOpen.rotation.y=Math.PI;expressionOpen.renderOrder=7;expressionOpen.visible=false;headGroup.add(expressionOpen);
    }

    const hairMat=new THREE.MeshStandardMaterial({color:hairCol,roughness:.84,metalness:0,envMapIntensity:.32,flatShading:false});
    const hairStyle=(a.hairStyle||0)%8;
    const addHair=(geometry,material=hairMat)=>{const mesh=CAST(new THREE.Mesh(geometry,material));headGroup.add(mesh);return mesh;};
    const addSideburns=(len=1.4,thick=.22,z=.24,y=.42)=>{
      [-1,1].forEach(side=>{
        const sb=addHair(new THREE.CylinderGeometry(thick*.76,thick,len,8));
        sb.position.set(side*2.58,y,z);
        sb.rotation.z=side*.06;
      });
    };
    const addNape=(w=2.0,h=.9,d=.38,y=.38,z=2.18)=>{
      const nape=addHair(new THREE.BoxGeometry(w,h,d));
      nape.position.set(0,y,z);
      return nape;
    };
    const addTempleWrap=(w=.44,h=1.45,d=1.2,y=1.0,z=.12)=>{
      [-1,1].forEach(side=>{
        const panel=addHair(new THREE.BoxGeometry(w,h,d));
        panel.position.set(side*2.72,y,z);
        panel.rotation.z=side*.05;
      });
    };
    const addShortCap=(rx=3.25,ry=.62,rz=.88,y=2.98,z=.02,phi=Math.PI*.46)=>{
      const cap=addHair(new THREE.SphereGeometry(rx,16,10,0,Math.PI*2,0,phi));
      cap.scale.set(1.02*headScaleX,ry,rz*headScaleZ);
      cap.position.set(0,y,z);
      return cap;
    };

    if(hairStyle===0){
      // Buzz cut / close crop
      addShortCap(3.18,.52,.86,2.96,.02,Math.PI*.42);
      const crown=addHair(new THREE.CylinderGeometry(2.30,2.58,1.10,14,true));
      crown.position.set(0,1.86,.08); crown.scale.z=.88;
      addTempleWrap(.36,1.18,1.0,.88,.12);
      addNape(1.7,.62,.30,.34,2.03);
    } else if(hairStyle===1){
      // Short side part
      addShortCap(3.34,.74,.90,3.00,.00,Math.PI*.50);
      const sweep=addHair(new THREE.BoxGeometry(2.05,.62,1.02));
      sweep.position.set(-.48,2.08,-2.00); sweep.rotation.x=-.15; sweep.rotation.z=-.12;
      const sideMass=addHair(new THREE.BoxGeometry(1.40,1.32,2.12));
      sideMass.position.set(-.95,2.12,-.58); sideMass.rotation.z=.10;
      const part=addHair(new THREE.BoxGeometry(.14,1.55,2.48),skin);
      part.position.set(.42,2.24,-.32); part.rotation.z=.14;
      addTempleWrap(.42,1.34,1.24,1.00,.10);
      addSideburns(1.36,.22,.16,.30);
      addNape(1.92,.72,.34,.38,2.14);
    } else if(hairStyle===2){
      // Quiff
      addShortCap(3.24,.68,.88,3.00,.04,Math.PI*.48);
      const topBack=addHair(new THREE.BoxGeometry(2.55,.88,2.05));
      topBack.position.set(0,2.34,-.22); topBack.rotation.x=.08;
      const quiff=addHair(new THREE.BoxGeometry(2.18,.92,1.08));
      quiff.position.set(0,2.16,-1.96); quiff.rotation.x=-.34;
      const frontRoll=addHair(new THREE.CylinderGeometry(.16,.22,1.78,10,false,Math.PI*.16,Math.PI*.68));
      frontRoll.rotation.z=Math.PI/2; frontRoll.rotation.y=Math.PI; frontRoll.position.set(0,1.88,-2.10);
      addTempleWrap(.38,1.18,1.1,.88,.14);
      addSideburns(1.22,.20,.18,.26);
      addNape(1.74,.60,.28,.32,2.08);
    } else if(hairStyle===3){
      // Messy crop
      addShortCap(3.30,.70,.90,3.02,.00,Math.PI*.48);
      [[-1.18,2.46,-1.52,.54],[-.36,2.84,-1.78,.66],[.44,2.70,-1.70,.64],[1.18,2.42,-1.48,.56],[0,3.12,-.82,.70]].forEach(([x,y,z,s])=>{
        const tuft=addHair(new THREE.SphereGeometry(.62*s,8,6));
        tuft.scale.set(1.28,1.0,.96); tuft.position.set(x,y,z);
      });
      addTempleWrap(.40,1.26,1.14,.92,.12);
      addSideburns(1.18,.18,.18,.26);
      addNape(1.86,.68,.32,.34,2.08);
    } else if(hairStyle===4){
      // Swept-back medium
      addShortCap(3.42,.80,.92,3.02,.06,Math.PI*.54);
      const crown=addHair(new THREE.BoxGeometry(2.75,1.12,2.42));
      crown.position.set(0,2.44,.34); crown.rotation.x=.18;
      const front=addHair(new THREE.BoxGeometry(2.22,.54,.92));
      front.position.set(0,1.98,-1.98); front.rotation.x=-.10;
      const backFlow=addHair(new THREE.BoxGeometry(2.38,1.18,.54));
      backFlow.position.set(0,.74,2.10);
      addTempleWrap(.46,1.72,1.28,.88,.16);
      addSideburns(1.82,.22,.18,.10);
      addNape(2.18,1.02,.40,.26,2.24);
    } else if(hairStyle===5){
      // Curly top
      const base=addShortCap(3.06,.50,.84,2.82,.04,Math.PI*.38);
      base.scale.set(1.01*headScaleX,.46,.84*headScaleZ);
      [[-1.46,2.58,-1.26],[-.72,2.98,-1.60],[.06,3.12,-1.74],[.88,2.92,-1.48],[1.54,2.54,-1.08],[-1.00,3.26,-.68],[0,3.48,-.54],[.98,3.24,-.76],[-1.60,2.12,-.18],[1.58,2.12,-.12]].forEach(([x,y,z])=>{
        const curl=addHair(new THREE.SphereGeometry(.48,8,6));
        curl.position.set(x,y,z);
      });
      addTempleWrap(.30,1.10,.92,.94,.16);
      addSideburns(1.00,.14,.18,.30);
      addNape(1.56,.54,.24,.36,2.02);
    } else if(hairStyle===6){
      // Afro / fuller curl
      const afro=addHair(new THREE.SphereGeometry(3.86,18,12));
      afro.scale.set(.94*headScaleX,.82,.90*headScaleZ); afro.position.set(0,2.94,-.02);
      const trim=addHair(new THREE.CylinderGeometry(2.22,2.46,1.00,14,true));
      trim.position.set(0,1.78,.08); trim.scale.z=.90;
      addNape(1.86,.62,.26,.34,2.06);
    } else if(hairStyle===7){
      // Curtains / centre part
      addShortCap(3.34,.70,.90,3.00,.00,Math.PI*.48);
      const leftCurtain=addHair(new THREE.BoxGeometry(1.08,1.92,.96));
      leftCurtain.position.set(-.70,1.62,-1.94); leftCurtain.rotation.z=-.16; leftCurtain.rotation.x=.08;
      const rightCurtain=addHair(new THREE.BoxGeometry(1.08,1.92,.96));
      rightCurtain.position.set(.70,1.62,-1.94); rightCurtain.rotation.z=.16; rightCurtain.rotation.x=.08;
      const crown=addHair(new THREE.BoxGeometry(2.45,.80,2.00));
      crown.position.set(0,2.32,-.16);
      const part=addHair(new THREE.BoxGeometry(.12,1.80,2.24),skin);
      part.position.set(0,2.10,-.40);
      addTempleWrap(.40,1.40,1.18,.96,.12);
      addSideburns(1.58,.18,.18,.18);
      addNape(2.10,.82,.34,.42,2.16);
    }

    if(a.beardStyle===4){
      // Long beard is a separate accessory around the locked head. It does not alter the SculptGL face geometry.
      const beardMat=new THREE.MeshStandardMaterial({color:hairCol,roughness:.91,metalness:0,envMapIntensity:.18,flatShading:false});
      const jawGeo=new THREE.SphereGeometry(1.18,12,9),chinGeo=new THREE.SphereGeometry(1.42,14,10);
      [-1,1].forEach(side=>{
        const jaw=addHair(jawGeo,beardMat);jaw.scale.set(.78,1.22,.54);jaw.position.set(side*1.35,-1.90,-2.05);jaw.rotation.z=-side*.18;
      });
      const chin=addHair(chinGeo,beardMat);chin.scale.set(1.16,1.30,.62);chin.position.set(0,-2.82,-2.10);
      const drop=addHair(new THREE.ConeGeometry(1.34,2.45,14),beardMat);drop.rotation.z=Math.PI;drop.scale.set(1.0,1.0,.58);drop.position.set(0,-3.76,-2.00);
      [-1,1].forEach(side=>{const moustache=addHair(new THREE.CylinderGeometry(.12,.18,1.02,9),beardMat);moustache.rotation.z=Math.PI/2+side*.20;moustache.position.set(side*.50,-1.72,-2.57);});
    }

    const toeMat=new THREE.MeshStandardMaterial({color:bootCol===0xf2f2ef?0xdfdfdc:0x151617,roughness:.52,metalness:.025,flatShading:false});
    const soleMat=new THREE.MeshStandardMaterial({color:0x090a0b,roughness:.62,flatShading:false});
    const laceMat=new THREE.MeshStandardMaterial({color:bootCol===0xf2f2ef?0xd7d7d3:0xe7e7e3,roughness:.84,flatShading:false});
    const mkLeg=sx=>{
      const hip=new THREE.Group(),legScale=archetype.legLength,thick=archetype.thigh;
      const hipSocket=CAST(new THREE.Mesh(new THREE.SphereGeometry(1.58,11,8),shorts));
      hipSocket.scale.set(1.04*thick,.82,.94*bodyD);hipSocket.position.y=-.05;hip.add(hipSocket);

      const shortLeg=CAST(new THREE.Mesh(bodyGeo.shortsLeg,shorts));
      shortLeg.scale.set(1.03*thick,1,.92*bodyD);shortLeg.position.y=-2.30;hip.add(shortLeg);
      const shortCuff=CAST(new THREE.Mesh(new THREE.TorusGeometry(1.52*thick,.12,6,14),trimMat));
      shortCuff.rotation.x=Math.PI/2;shortCuff.scale.z=.91*bodyD;shortCuff.position.y=-4.20;hip.add(shortCuff);

      const thigh=CAST(new THREE.Mesh(bodyGeo.thigh,skin));
      thigh.scale.set(thick,legScale,.92*bodyD);thigh.position.y=-9.02;hip.add(thigh);
      const knee=new THREE.Group();knee.position.y=-13.82-(legScale-1)*5.0;hip.add(knee);
      const kneeJoint=CAST(new THREE.Mesh(new THREE.SphereGeometry(1.08,11,8),skin));
      kneeJoint.scale.set(1.00*thick,.80,.91*bodyD);kneeJoint.position.y=-.02;knee.add(kneeJoint);

      const sockCuff=CAST(new THREE.Mesh(new THREE.TorusGeometry(1.04*archetype.calf,.14,6,14),trimMat));
      sockCuff.rotation.x=Math.PI/2;sockCuff.scale.z=.90*bodyD;sockCuff.position.y=-1.05;knee.add(sockCuff);
      const shin=CAST(new THREE.Mesh(bodyGeo.calf,sock));
      shin.scale.set(archetype.calf,legScale,.91*bodyD);shin.position.y=-5.34;knee.add(shin);
      const ankleJoint=CAST(new THREE.Mesh(new THREE.SphereGeometry(.80,9,7),sock));
      ankleJoint.scale.set(.90*archetype.calf,.68,.83*bodyD);ankleJoint.position.y=-9.86-(legScale-1)*5.0;knee.add(ankleJoint);
      const ankleCollar=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.88,.96,1.00,10),sock));
      ankleCollar.scale.set(archetype.calf,1,.89*bodyD);ankleCollar.position.y=-10.18-(legScale-1)*5.0;knee.add(ankleCollar);

      const footBaseY=-9.90-(legScale-1)*10.0,footGroup=new THREE.Group();footGroup.position.set(0,footBaseY,-.76);knee.add(footGroup);
      footGroup.userData={baseY:footBaseY,baseZ:-.76,baseX:0};
      const shoeUpper=CAST(new THREE.Mesh(bodyGeo.bootUpper,boot));
      shoeUpper.scale.set(1.42,.68,3.02);shoeUpper.position.set(0,-.04,-1.58);footGroup.add(shoeUpper);
      const toeCap=CAST(new THREE.Mesh(bodyGeo.bootToe,toeMat));
      toeCap.scale.set(1.30,.52,1.48);toeCap.position.set(0,-.02,-4.12);footGroup.add(toeCap);
      const instep=CAST(new THREE.Mesh(bodyGeo.bootUpper,boot));
      instep.scale.set(.94,.34,1.18);instep.position.set(0,.55,-1.12);footGroup.add(instep);
      const heel=CAST(new THREE.Mesh(bodyGeo.bootHeel,boot));
      heel.scale.set(1.06,.58,.78);heel.position.set(0,-.02,1.02);footGroup.add(heel);
      const sole=CAST(new THREE.Mesh(bodyGeo.sole,soleMat));sole.position.set(0,-.72,-1.52);footGroup.add(sole);
      const tongue=CAST(new THREE.Mesh(bodyGeo.tongue,sock));tongue.position.set(0,.73,-.88);footGroup.add(tongue);
      [-.38,-.12,.14,.40].forEach(x=>{const lace=CAST(new THREE.Mesh(bodyGeo.lace,laceMat));lace.rotation.x=Math.PI/2;lace.position.set(x,.72,-1.02);footGroup.add(lace);});
      footGroup.rotation.x=-.025;

      hip.position.set(sx,24.55+legLift,0);hip.userData={knee,footGroup};return hip;
    };
    const legL=mkLeg(-2.66*archetype.stance*archetype.hip),legR=mkLeg(2.66*archetype.stance*archetype.hip);grp.add(legL,legR);

    const longSleeve=!official&&(a.sleeveIndex===3||MATCH_YEAR<1935||(CONFIG.weather==='rain'&&a.sleeveIndex>1));
    const gloveStyle=Number(a.gloveStyle||0),gloveMat=gloveStyle?new THREE.MeshStandardMaterial({color:gloveStyle===2?0xe9ecef:0x111418,roughness:gloveStyle===2?.58:.76,metalness:0,envMapIntensity:.24,flatShading:false}):skin;
    const mkArm=sx=>{
      const sh=new THREE.Group(),side=sx<0?-1:1,armScale=archetype.armLength,thick=archetype.limb;
      const shoulderSocket=CAST(new THREE.Mesh(new THREE.SphereGeometry(1.58,12,9),kit));
      shoulderSocket.scale.set(1.12*thick,.88,.98*bodyD);shoulderSocket.position.set(0,.02,.02);sh.add(shoulderSocket);
      const sleeveCrown=CAST(new THREE.Mesh(new THREE.SphereGeometry(1.55,11,8),kit));
      sleeveCrown.scale.set(1.04*thick,.76,.96*bodyD);sleeveCrown.position.set(0,-1.05,.02);sh.add(sleeveCrown);
      const sleeve=CAST(new THREE.Mesh(bodyGeo.sleeve,kit));
      sleeve.scale.set(thick,1,.92*bodyD);sleeve.position.y=-3.12;sh.add(sleeve);
      const sleeveCuff=CAST(new THREE.Mesh(new THREE.TorusGeometry(1.10*thick,.11,6,14),trimMat));
      sleeveCuff.rotation.x=Math.PI/2;sleeveCuff.scale.z=.91*bodyD;sleeveCuff.position.y=-5.18;sh.add(sleeveCuff);
      const upper=CAST(new THREE.Mesh(bodyGeo.upperArm,longSleeve?kit:skin));
      upper.scale.set(thick,armScale,.90*bodyD);upper.position.y=-9.02;sh.add(upper);
      const elbow=new THREE.Group();elbow.position.y=-13.05-(armScale-1)*4.4;sh.add(elbow);
      const elbowJoint=CAST(new THREE.Mesh(new THREE.SphereGeometry(.86,10,8),longSleeve?kit:skin));
      elbowJoint.scale.set(.99*thick,.78,.89*bodyD);elbow.add(elbowJoint);
      const fore=CAST(new THREE.Mesh(bodyGeo.forearm,longSleeve?kit:skin));
      fore.scale.set(thick,armScale,.88*bodyD);fore.position.y=-4.22;elbow.add(fore);
      const wristJoint=CAST(new THREE.Mesh(new THREE.SphereGeometry(.62,9,7),longSleeve?kit:skin));
      wristJoint.scale.set(.88*thick,.70,.81*bodyD);wristJoint.position.y=-8.24-(armScale-1)*4.0;elbow.add(wristJoint);
      const hand=CAST(new THREE.Mesh(bodyGeo.palm,gloveStyle?gloveMat:skin));
      hand.scale.set(.70*thick,.94,.52*bodyD);hand.position.set(0,-9.22-(armScale-1)*4.0,-.06);elbow.add(hand);
      const fingers=CAST(new THREE.Mesh(bodyGeo.fingers,gloveStyle?gloveMat:skin));
      fingers.position.set(0,-10.05-(armScale-1)*4.0,-.10);fingers.rotation.z=side*.025;elbow.add(fingers);
      const thumb=CAST(new THREE.Mesh(bodyGeo.thumb,gloveStyle?gloveMat:skin));
      thumb.scale.set(.32,.54,.28);thumb.position.set(side*.53,-9.15-(armScale-1)*4.0,-.02);thumb.rotation.z=-side*.38;elbow.add(thumb);
      if(gloveStyle){
        hand.scale.multiplyScalar(gloveStyle===2?1.18:1.06);fingers.scale.multiplyScalar(gloveStyle===2?1.12:1.04);thumb.scale.multiplyScalar(gloveStyle===2?1.14:1.04);
        const gloveCuff=CAST(new THREE.Mesh(new THREE.CylinderGeometry(.76*thick,.68*thick,1.38,10),gloveMat));gloveCuff.position.y=-8.52-(armScale-1)*4.0;elbow.add(gloveCuff);
      }
      sh.position.set(sx,40.50+legLift,.10);sh.rotation.z=-side*(.075+archetype.posture);sh.userData={elbow};return sh;
    };
    const armL=mkArm(-5.72*archetype.shoulder),armR=mkArm(5.72*archetype.shoulder);grp.add(armL,armR);

    if(number&&!official){
      const num=new THREE.Mesh(new THREE.PlaneGeometry(7.9,8.4),new THREE.MeshBasicMaterial({map:numberTexture(number,kind),transparent:true,side:THREE.DoubleSide}));
      num.position.set(0,35.0,3.2); body.add(num);
    }

    const contactShadow=new THREE.Mesh(new THREE.CircleGeometry(10.8,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.11,depthWrite:false}));
    contactShadow.rotation.x=-Math.PI/2; contactShadow.position.y=.18; contactShadow.scale.set(1.52,.44,1); grp.add(contactShadow);
    const ring=new THREE.Mesh(new THREE.RingGeometry(13,17,32),new THREE.MeshBasicMaterial({color:0xe87824,side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}));
    ring.rotation.x=-Math.PI/2; ring.position.y=.55; grp.add(ring);

    const scale=.948+(a.bodyIndex%5)*.012+(number%3)*.006, heightScale=[.95,.97,.985,1,1.02,1.04,1.055][a.heightIndex%7];
    grp.scale.set(scale,scale*heightScale,scale);
    grp.userData={
      ring,
      shadow:contactShadow,
      body,
      torso:torsoGroup,
      chest,
      hips:pelvis,
      headGroup,
      legL,legR,
      armL,armR,
      kneeL:legL.userData.knee,
      kneeR:legR.userData.knee,
      footL:legL.userData.footGroup,
      footR:legR.userData.footGroup,
      elbL:armL.userData.elbow,
      elbR:armR.userData.elbow,
      phase:(number*1.7)%6.28,
      prevWx:null,prevWz:null,prevSpeed:0,faceY:undefined,kind,bodyArchetype:archetype.name,expression:{eyes:expressionEyes,irises:expressionIrises,brows:expressionBrows,baseMouth:expressionBaseMouth,smile:expressionSmile,frown:expressionFrown,open:expressionOpen},motion:{stride:archetype.stride,armSwing:archetype.armSwing,posture:archetype.posture,toeOut:.035+((number+a.bodyIndex)%4)*.012,idleSide:(number%2?-1:1),asym:.92+((number*7)%9)*.018}
    };
    return grp;
  }

  window.FLCreatePlayerModel={
    setStyle(style){PREVIEW_STYLE={...PREVIEW_STYLE,...style};Object.keys(crestTextureCache).forEach(k=>{crestTextureCache[k].dispose?.();delete crestTextureCache[k];});Object.keys(sponsorTextureCache).forEach(k=>{sponsorTextureCache[k].dispose?.();delete sponsorTextureCache[k];});},
    create(spec){return playerMesh(spec);}
  };
})();
