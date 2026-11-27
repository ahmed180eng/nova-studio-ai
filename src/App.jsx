import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  Film, Music2, Type, Sticker, Sparkles, Scissors, SlidersHorizontal,
  LayoutTemplate, FolderOpen, Upload, Play, Pause, SkipBack, SkipForward,
  Plus, Minus, Undo2, Redo2, Trash2, Download, Settings, HelpCircle,
  MessageCircle, WandSparkles, Captions, Video, Image as ImageIcon,
  Volume2, X, Send, Bot, ChevronDown
} from 'lucide-react'

const nav = [
  [FolderOpen,'الوسائط'],[Music2,'الصوت'],[Type,'النص'],[Sticker,'الملصقات'],
  [Sparkles,'التأثيرات'],[Scissors,'الانتقالات'],[SlidersHorizontal,'الفلاتر'],[LayoutTemplate,'القوالب']
]
const fmt = (v=0) => {
  const s=Math.max(0,Math.floor(v))
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')
}

export default function App() {
  const [assets,setAssets]=useState([])
  const [clips,setClips]=useState([])
  const [selected,setSelected]=useState(null)
  const [playing,setPlaying]=useState(false)
  const [duration,setDuration]=useState(0)
  const [current,setCurrent]=useState(0)
  const [chat,setChat]=useState('')
  const [chatMessages,setChatMessages]=useState([{role:'assistant',content:'أهلاً بيك! أنا مساعد NOVA. أقدر أساعدك في الأفكار والسكريبتات وخطة المونتاج والترجمة.'}])
  const [chatLoading,setChatLoading]=useState(false)
  const [videoPrompt,setVideoPrompt]=useState('')
  const [videoStyle,setVideoStyle]=useState('3D كرتون')
  const [videoRatio,setVideoRatio]=useState('9:16')
  const [videoDuration,setVideoDuration]=useState('5')
  const [videoScenes,setVideoScenes]=useState('مشهد واحد')
  const [preparedPrompt,setPreparedPrompt]=useState('')
  const [textOverlay,setTextOverlay]=useState('')
  const [overlayInput,setOverlayInput]=useState('')
  const [activeTool,setActiveTool]=useState('الوسائط')
  const [zoom,setZoom]=useState(1)
  const [volume,setVolume]=useState(1)
  const [exporting,setExporting]=useState(false)
  const videoRef=useRef(null)
  const audioRef=useRef(null)
  const fileRef=useRef(null)
  const selectedClip=clips.find(c=>c.id===selected)
  const activeAsset=assets.find(a=>a.id===(selectedClip?.assetId || selected))
  const isVideo=activeAsset?.type==='video'
  const selectedDuration=selectedClip ? Math.max(0.1,selectedClip.out-selectedClip.in) : duration
  const totalDuration=useMemo(()=>clips.reduce((sum,c)=>sum+Math.max(.1,c.out-c.in),0),[clips])

  const addFiles=(files)=>{
    const incoming=Array.from(files||[]).map(file=>{
      const url=URL.createObjectURL(file)
      const type=file.type.startsWith('video')?'video':file.type.startsWith('audio')?'audio':'image'
      return {id:crypto.randomUUID(),name:file.name,url,type,file,duration:type==='image'?5:0}
    })
    setAssets(prev=>[...prev,...incoming])
    if(incoming[0]) setSelected(incoming[0].id)
  }
  const addToTimeline=(asset)=>{
    if(!asset)return
    const clip={id:crypto.randomUUID(),assetId:asset.id,in:0,out:asset.type==='image'?5:(asset.duration||5)}
    setClips(prev=>[...prev,clip])
    setSelected(clip.id)
  }
  const onMeta=(e)=>{
    const d=e.currentTarget.duration||5
    setDuration(d)
    setAssets(prev=>prev.map(a=>a.id===activeAsset?.id?{...a,duration:d}:a))
    setClips(prev=>prev.map(c=>c.assetId===activeAsset?.id&&c.out<=5?{...c,out:d}:c))
    if(selectedClip)setCurrent(selectedClip.in)
  }
  const togglePlay=async()=>{
    if(!videoRef.current)return
    if(playing){videoRef.current.pause();setPlaying(false)}
    else {try{await videoRef.current.play();setPlaying(true)}catch{}}
  }
  const seek=(v)=>{
    const t=Number(v);setCurrent(t)
    if(videoRef.current)videoRef.current.currentTime=t
  }
  const splitClip=()=>{
    if(!selectedClip||current<=selectedClip.in+.05||current>=selectedClip.out-.05)return
    const left={...selectedClip,out:current}
    const right={...selectedClip,id:crypto.randomUUID(),in:current}
    setClips(prev=>prev.flatMap(c=>c.id===selected? [left,right]:[c]))
    setSelected(right.id)
  }
  const deleteClip=()=>{
    if(!selectedClip)return
    setClips(prev=>prev.filter(c=>c.id!==selected))
    setSelected(null);setPlaying(false)
  }
  const updateTrim=(key,value)=>{
    if(!selectedClip)return
    const v=Number(value)
    setClips(prev=>prev.map(c=>c.id===selected?{...c,[key]:key==='in'?Math.min(v,c.out-.1):Math.max(v,c.in+.1)}:c))
    if(key==='in')seek(v)
  }
  const removeAsset=(id)=>{
    const a=assets.find(x=>x.id===id)
    if(a?.url)URL.revokeObjectURL(a.url)
    setAssets(prev=>prev.filter(x=>x.id!==id))
    setClips(prev=>prev.filter(c=>c.assetId!==id))
    if(selected===id||selectedClip?.assetId===id)setSelected(null)
  }
  const prepareVideoPrompt=()=>{
    if(!videoPrompt.trim())return
    const longForm=Number(videoDuration)>=600
    const result=longForm
      ? `أنت مخرج وكاتب سيناريو رسوم متحركة محترف. جهّز خطة إنتاج كاملة لفيلم كرتون ${videoStyle} مدته الإجمالية 10 دقائق، بنسبة أبعاد ${videoRatio}.\nفكرة القصة: ${videoPrompt.trim()}\nقسّم الفيلم إلى 60 مشهداً متتابعاً، مدة كل مشهد نحو 10 ثوانٍ. لكل مشهد اكتب: رقم المشهد، وصف الصورة والحركة، الشخصيات الظاهرة، حركة الكاميرا، الحوار العربي، التعليق الصوتي، المؤثرات الصوتية، وبرومبت مستقل جاهز لتوليد هذا المشهد.\nابدأ بمقدمة جذابة، ثم تصاعد للأحداث ومشكلة واضحة ومغامرة وحل ونهاية مؤثرة. اجعل اللغة عربية سهلة ومناسبة للأطفال، وتجنب العنف المخيف. حافظ بدقة على ثبات ملامح وألوان وملابس الشخصيات والأماكن في جميع المشاهد. اربط نهاية كل مشهد ببداية المشهد التالي.\nمهم: هذه خطة لإنتاج الفيلم على مشاهد منفصلة ثم تجميعها بالمونتاج، وليست طلباً لتوليد عشر دقائق في لقطة واحدة. لا تختصر المشاهد ولا تكررها.`
      : `أنشئ فيديو ${videoStyle} بجودة سينمائية.\nالوصف: ${videoPrompt.trim()}\nالمدة: ${videoDuration} ثوانٍ.\nالأبعاد: ${videoRatio}.\nتقسيم المشاهد: ${videoScenes}.\nحافظ على ثبات شكل الشخصيات والألوان والإضاءة بين اللقطات، مع حركة طبيعية للكاميرا والشخصيات، وتفاصيل واضحة ومناسبة للنشر.`
    setPreparedPrompt(result)
  }
  const copyPreparedPrompt=async()=>{
    if(!preparedPrompt)return
    try{await navigator.clipboard.writeText(preparedPrompt);alert('تم نسخ البرومبت.')}catch{alert('تعذر النسخ تلقائياً؛ يمكنك تحديد النص ونسخه.')}
  }
  const exportTimeline=async()=>{
    const resolvedClips=clips.map(clip=>({...clip,asset:assets.find(a=>a.id===clip.assetId)})).filter(x=>x.asset)
    const visualClips=resolvedClips.filter(x=>['image','video'].includes(x.asset.type))
    const audioClips=resolvedClips.filter(x=>x.asset.type==='audio')
    if(!visualClips.length){alert('أضف صوراً أو فيديوهات إلى التايم لاين أولاً.');return}
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){alert('تصدير الفيديو غير مدعوم في هذا المتصفح. افتح NOVA من Chrome على أندرويد.');return}
    setExporting(true)
    let recorder,audioContext,audioDestination
    try{
      const portrait=videoRatio==='9:16'
      const canvas=document.createElement('canvas');canvas.width=portrait?720:1280;canvas.height=portrait?1280:720
      const ctx=canvas.getContext('2d'),stream=canvas.captureStream(30),chunks=[]
      const AudioContextClass=window.AudioContext||window.webkitAudioContext
      if((visualClips.length>1||visualClips.some(x=>x.asset.type==='video')||audioClips.length)&&AudioContextClass){audioContext=new AudioContextClass();audioDestination=audioContext.createMediaStreamDestination();stream.addTrack(audioDestination.stream.getAudioTracks()[0]);await audioContext.resume()}
      let scheduledAudioDuration=0
      if(audioContext&&audioClips.length){let audioCursor=audioContext.currentTime+.25;for(const item of audioClips){const bytes=await item.asset.file.arrayBuffer();const buffer=await audioContext.decodeAudioData(bytes);const offset=Math.min(item.in,buffer.duration);const end=Math.min(item.out,buffer.duration);const seconds=Math.max(0,end-offset);if(seconds>0){const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioDestination);source.start(audioCursor,offset,seconds);audioCursor+=seconds;scheduledAudioDuration+=seconds}}}
      const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))
      if(!mimeType)throw new Error('المتصفح لا يدعم صيغة تصدير الفيديو المتاحة.')
      recorder=new MediaRecorder(stream,{mimeType});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
      const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('حدث خطأ أثناء تسجيل الفيديو.'))})
      recorder.start(250)
      const drawCover=source=>{const sw=source.videoWidth||source.naturalWidth||canvas.width,sh=source.videoHeight||source.naturalHeight||canvas.height,scale=Math.max(canvas.width/sw,canvas.height/sh),w=sw*scale,h=sh*scale;ctx.fillStyle='#05080b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,(canvas.width-w)/2,(canvas.height-h)/2,w,h);if(textOverlay){ctx.direction='rtl';ctx.textAlign='center';ctx.font='bold 42px Cairo, sans-serif';ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.strokeText(textOverlay,canvas.width/2,canvas.height*.86,canvas.width*.9);ctx.fillStyle='#fff';ctx.fillText(textOverlay,canvas.width/2,canvas.height*.86,canvas.width*.9)}}
      const playWhoosh=()=>{
        if(!audioContext||!audioDestination)return
        const duration=.38,length=Math.floor(audioContext.sampleRate*duration),buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0)
        for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length)
        const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain()
        source.buffer=buffer;filter.type='highpass';filter.frequency.value=650;gain.gain.setValueAtTime(.0001,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.16,audioContext.currentTime+.06);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration)
        source.connect(filter);filter.connect(gain);gain.connect(audioDestination);source.start();source.stop(audioContext.currentTime+duration)
      }
      const transitionToBlack=async()=>{
        const start=performance.now(),duration=360
        playWhoosh()
        while(performance.now()-start<duration){const progress=Math.min(1,(performance.now()-start)/duration);ctx.globalAlpha=progress;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;await new Promise(r=>requestAnimationFrame(r))}
      }
      for(let clipIndex=0;clipIndex<visualClips.length;clipIndex++){
        const item=visualClips[clipIndex],asset=item.asset
        if(asset.type==='image'){const img=new Image();img.src=asset.url;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('تعذر فتح الصورة: '+asset.name))});const start=performance.now(),seconds=Math.max(.2,item.out-item.in);while((performance.now()-start)/1000<seconds){drawCover(img);await new Promise(r=>requestAnimationFrame(r))}}
        else{const video=document.createElement('video');video.src=asset.url;video.muted=false;video.volume=1;video.playsInline=true;video.preload='auto';await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error('تعذر فتح الفيديو: '+asset.name))});if(audioContext&&audioDestination){const source=audioContext.createMediaElementSource(video);source.connect(audioDestination)}video.currentTime=Math.min(item.in,Math.max(0,video.duration-.05));await new Promise(resolve=>{video.onseeked=resolve;setTimeout(resolve,1200)});const end=Math.min(item.out,video.duration);await video.play();while(video.currentTime<end&&!video.ended){drawCover(video);await new Promise(r=>requestAnimationFrame(r))}video.pause()}
        if(clipIndex<visualClips.length-1)await transitionToBlack()
      }
      if(scheduledAudioDuration>0){const visualSeconds=visualClips.reduce((sum,item)=>sum+Math.max(.2,item.out-item.in),0);const remaining=scheduledAudioDuration-visualSeconds;if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining*1000))}
      recorder.stop();await finished
      const blob=new Blob(chunks,{type:mimeType}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='NOVA-video.webm';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
      alert('تم تصدير الفيديو. الملف بصيغة WebM. يتضمن صوت الفيديو الأصلي وملفات الصوت المنفصلة (تُشغّل بالتتابع من بداية الفيديو).')
    }catch(error){if(recorder&&recorder.state!=='inactive')recorder.stop();alert(error.message||'تعذر تصدير الفيديو.')}finally{if(audioContext){await audioContext.close().catch(()=>{})}setExporting(false)}
  }
  const sendChat=async()=>{
    const message=chat.trim()
    if(!message||chatLoading)return
    const history=[...chatMessages,{role:'user',content:message}]
    setChatMessages(history)
    setChat('')
    setChatLoading(true)
    try{
      const apiBase=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'')
      const response=await fetch(apiBase+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:history.slice(-10)})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error||'حصلت مشكلة في الاتصال بالمساعد.')
      setChatMessages(prev=>[...prev,{role:'assistant',content:data.reply||'لم يصل رد من المساعد.'}])
    }catch(error){
      setChatMessages(prev=>[...prev,{role:'assistant',content:error.message||'تعذر الاتصال. تأكد من إعداد خادم NOVA ومفتاح API.'}])
    }finally{setChatLoading(false)}
  }
  useEffect(()=>{if(videoRef.current)videoRef.current.volume=volume},[volume,activeAsset?.id])
  const previewSource=activeAsset?.url
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 30V10l22 20V10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 15l8 5-8 5z" fill="#07151a"/></svg></div><span>NOVA</span></div>
      <div className="project-name">مشروع بدون عنوان <ChevronDown size={14}/></div>
      <div className="top-actions"><button className="icon-btn" title="تراجع"><Undo2/></button><button className="icon-btn" title="إعادة"><Redo2/></button><span className="divider-v"/><button className="icon-btn"><HelpCircle/></button><button className="icon-btn"><Settings/></button><button className="export" onClick={exportTimeline} disabled={exporting}><Download size={17}/> {exporting?"جاري التصدير...":"تصدير الفيديو"}</button></div>
    </header>
    <div className="workspace">
      <aside className="sidebar">{nav.map(([Icon,label])=><button key={label} className={`nav-item ${activeTool===label?'active':''}`} onClick={()=>setActiveTool(label)}><Icon size={21}/><span>{label}</span></button>)}</aside>
      <section className={`media-panel panel ${activeTool==='مولّد AI' ? 'ai-generator-panel' : ''}`}>
        <div className="panel-tabs"><button className={`tab ${activeTool!=='مولّد AI'?'active':''}`} onClick={()=>setActiveTool('الوسائط')}>المشروع</button><button className="tab" onClick={()=>setActiveTool('المكتبة')}>المكتبة</button><button className={`tab ${activeTool==='مولّد AI'?'active':''}`} onClick={()=>setActiveTool('مولّد AI')}>مولّد AI</button></div>
        {activeTool==='مولّد AI'?<div className="video-generator">
          <div className="generator-title"><WandSparkles size={20}/><div><b>إنشاء فيديو بالذكاء الاصطناعي</b><span>اكتب وصف المشهد وحدد شكل الفيديو</span></div></div>
          <label>وصف الفيديو (Prompt)</label>
          <textarea className="generator-prompt" value={videoPrompt} onChange={e=>setVideoPrompt(e.target.value)} placeholder="مثال: أرنب صغير يجري في غابة سحرية، والكاميرا تتبعه بين الأشجار..."/>
          <label>ستايل الفيديو</label>
          <div className="generator-options">{['3D كرتون','أنمي','واقعي سينمائي','رسوم 2D'].map(s=><button key={s} className={videoStyle===s?'chosen':''} onClick={()=>setVideoStyle(s)}>{s}</button>)}</div>
          <div className="generator-fields">
            <div><label>المقاس</label><select value={videoRatio} onChange={e=>setVideoRatio(e.target.value)}><option>9:16</option><option>16:9</option></select></div>
            <div><label>المدة</label><select value={videoDuration} onChange={e=>setVideoDuration(e.target.value)}><option value="5">5 ثوانٍ</option><option value="10">10 ثوانٍ</option><option value="15">15 ثانية</option><option value="600">10 دقائق (خطة 60 مشهداً)</option></select></div>
          </div>
          <label>تكوين المشاهد</label>
          <select value={videoScenes} onChange={e=>setVideoScenes(e.target.value)}><option>مشهد واحد</option><option>عدة لقطات متتابعة</option></select>
          <button className="prepare-prompt" onClick={prepareVideoPrompt} disabled={!videoPrompt.trim()}><Sparkles size={16}/> تجهيز البرومبت</button>
          {preparedPrompt&&<div className="prepared-prompt"><b>البرومبت الجاهز</b><p>{preparedPrompt}</p><button onClick={copyPreparedPrompt}><Download size={14}/> نسخ البرومبت</button></div>}
          <div className="generator-free-space">
            <div className="generator-free-intro">
              <b>مولّد فيديو مجاني عبر Hugging Face</b>
              <p>جهّز البرومبت من الأعلى، انسخه، ثم الصقه داخل المولّد. اضغط على زر فتح المولّد لو احتجت مساحة أكبر.</p>
              <a href="https://huggingface.co/spaces/Lightricks/ltx-2-distilled" target="_blank" rel="noreferrer">فتح المولّد في صفحة مستقلة</a>
            </div>
            <iframe
              title="LTX-2 Video Fast by Hugging Face"
              src="https://lightricks-ltx-2-distilled.hf.space"
              loading="lazy"
              allow="clipboard-read; clipboard-write; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="generator-notice"><b>مهم بخصوص الاستخدام المجاني</b><span>هذا محرك مجتمعي على Hugging Face. الحساب المجاني له حصة GPU يومية محدودة (حوالي 5 دقائق في ZeroGPU)، وقد تحتاج إلى الانتظار حسب الضغط. لا يوجد ضمان لتوليد غير محدود أو سرعة ثابتة.</span></div>
        </div>:<>
        <div className="media-heading"><b>{activeTool}</b><button className="small-btn" onClick={()=>fileRef.current?.click()}><Plus size={15}/> استيراد</button></div>
        <button className="import-box" onClick={()=>fileRef.current?.click()}><Upload size={24}/><b>استيراد الوسائط</b><span>فيديوهات، صور، وملفات صوت</span></button>
        <input ref={fileRef} type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={e=>addFiles(e.target.files)}/>
        <div className="asset-grid">{assets.map(a=><div key={a.id} className={`asset ${selected===a.id?'chosen':''}`} onClick={()=>setSelected(a.id)}>
          <div className="asset-thumb">{a.type==='video'?<Video/>:a.type==='audio'?<Music2/>:<ImageIcon/>}<button className="asset-remove" onClick={e=>{e.stopPropagation();removeAsset(a.id)}}><X size={12}/></button></div>
          <span title={a.name}>{a.name}</span><button className="small-btn" style={{marginTop:5,width:'100%',justifyContent:'center'}} onClick={e=>{e.stopPropagation();addToTimeline(a)}}><Plus size={12}/> للتايم لاين</button>
        </div>)}</div>
        {assets.length===0&&<div className="empty-hint">استورد ملفاتك ثم اضغط «للتايم لاين» لبدء المونتاج</div>}
        </>}
      </section>
      <main className="center">
        <div className="preview panel">
          <div className="preview-head"><span>المعاينة</span><span className="muted">مشغل الفيديو <ChevronDown size={13}/></span></div>
          <div className="preview-stage">
            {isVideo?<video key={activeAsset.id} ref={videoRef} src={previewSource} onLoadedMetadata={onMeta} onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)} onEnded={()=>setPlaying(false)} />:
             activeAsset?.type==='image'?<img src={previewSource}/>:<div className="preview-placeholder"><Film size={52}/><b>{activeAsset?.type==='audio'?'ملف صوتي محدد':'ابدأ باستيراد فيديو أو صورة'}</b><span>معاينة مشروع NOVA</span></div>}
            {textOverlay&&<div style={{position:'absolute',bottom:'18%',left:0,right:0,textAlign:'center',fontSize:28,fontWeight:800,color:'white',textShadow:'0 2px 8px #000'}}>{textOverlay}</div>}
          </div>
          <div className="player-controls"><span className="timecode">{fmt(current)} <i>/</i> {fmt(duration)}</span><div className="transport"><button onClick={()=>seek(0)}><SkipBack size={17}/></button><button className="play" onClick={togglePlay}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button onClick={()=>seek(duration)}><SkipForward size={17}/></button></div><span className="ratio">16:9</span></div>
        </div>
        <div className="timeline panel">
          <div className="timeline-toolbar"><div className="tool-group"><button title="تقسيم عند المؤشر" onClick={splitClip}><Scissors/></button><button title="حذف المقطع المحدد" onClick={deleteClip}><Trash2/></button><button title="إضافة ملف" onClick={()=>fileRef.current?.click()}><Plus/></button></div><div className="tool-group"><button onClick={()=>setZoom(z=>Math.max(.5,z-.1))}><Minus/></button><span className="zoom-label">{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(2,z+.1))}><Plus/></button></div></div>
          <div className="ruler"><span>00:00</span><span>{fmt(totalDuration/4)}</span><span>{fmt(totalDuration/2)}</span><span>{fmt(totalDuration*.75)}</span><span>{fmt(totalDuration)}</span></div>
          <div className="tracks"><div className="track-label"><Film size={15}/> فيديو / صور</div><div className="track-content">
            {clips.filter(c=>['video','image'].includes(assets.find(a=>a.id===c.assetId)?.type)).map(c=>{const a=assets.find(x=>x.id===c.assetId);return <button key={c.id} className={`clip ${selected===c.id?'selected':''}`} style={{width:`${Math.max(80,(c.out-c.in)*28*zoom)}px`}} onClick={()=>{setSelected(c.id);seek(c.in)}}><Film size={14}/><span>{a?.name}</span></button>})}
            {clips.length===0&&<span style={{color:'#656b79',fontSize:10,padding:8}}>أضف مقاطعك هنا من قائمة الوسائط</span>}
          </div><div className="track-label"><Music2 size={15}/> صوت</div><div className="track-content audio-track">{clips.filter(c=>assets.find(a=>a.id===c.assetId)?.type==='audio').map(c=><button key={c.id} className="audio-clip" onClick={()=>setSelected(c.id)}><Volume2 size={14}/>{assets.find(a=>a.id===c.assetId)?.name}</button>)}</div></div>
          {selectedClip&&<div style={{padding:'8px 2px',display:'flex',gap:10,alignItems:'center',fontSize:10,color:'#aeb4c2',flexWrap:'wrap'}}><span>بداية المقطع</span><input aria-label="بداية المقطع" type="range" min="0" max={Math.max(.1,selectedClip.out-.1)} step=".1" value={selectedClip.in} onChange={e=>updateTrim('in',e.target.value)}/><span>{fmt(selectedClip.in)}</span><span>نهاية المقطع</span><input aria-label="نهاية المقطع" type="range" min={selectedClip.in+.1} max={Math.max(selectedClip.in+.1,assets.find(a=>a.id===selectedClip.assetId)?.duration||duration||5)} step=".1" value={selectedClip.out} onChange={e=>updateTrim('out',e.target.value)}/><span>{fmt(selectedClip.out)}</span></div>}
          <div className="timeline-footer"><span>{clips.length} مقطع</span><span>حدد المقطع ثم استخدم المقص للتقسيم أو اسحب مقابض القص</span></div>
        </div>
      </main>
      <aside className="ai-panel panel">
        <div className="ai-header"><div className="ai-logo"><Bot size={22}/></div><div><b>مساعد NOVA AI</b><span>مساعد الأفكار والسيناريو</span></div><span className="online-dot"/></div>
        <div className="ai-intro"><div className="orb"><WandSparkles size={26}/></div><h3>خلّي الذكاء الاصطناعي يساعدك</h3><p>أدوات تحرير أساسية بدأت تشتغل داخل المشروع.</p></div>
        <div className="quick-actions"><button onClick={()=>setChat('اقترح فكرة ريلز جذابة مدتها 30 ثانية')}><Sparkles/> فكرة فيديو</button><button onClick={()=>setChat('اكتب سيناريو قصير للفيديو')}><Type/> سيناريو</button><button onClick={()=>setChat('اقترح ترتيب اللقطات والانتقالات')}><Scissors/> خطة مونتاج</button><button onClick={()=>setChat('اكتب ترجمة وعناوين مناسبة للفيديو')}><Captions/> عناوين وترجمة</button></div>
        <div style={{padding:'8px 11px',borderTop:'1px solid #292b35'}}><b style={{fontSize:11}}>إضافة نص على المعاينة</b><input value={overlayInput} onChange={e=>setOverlayInput(e.target.value)} placeholder="اكتب النص هنا..." style={{width:'100%',marginTop:6,padding:8,borderRadius:6,background:'#101219',border:'1px solid #343744',color:'white',fontFamily:'inherit'}}/><button className="small-btn" style={{marginTop:6}} onClick={()=>setTextOverlay(overlayInput)}>إضافة النص</button><button className="small-btn" style={{marginTop:6,marginRight:6}} onClick={()=>setTextOverlay('')}>إزالة النص</button></div>
        <div className="chat-messages">{chatMessages.map((item,index)=><div key={index} className={`message ${item.role==='user'?'user':'assistant'}`}><span className="message-icon">{item.role==='user'?'●':<Bot size={15}/>}</span><p>{item.content}</p></div>)}{chatLoading&&<div className="message assistant"><span className="message-icon"><Bot size={15}/></span><p>مساعد NOVA بيكتب الرد...</p></div>}</div>
        <div className="chat-compose"><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="اكتب طلبك لمساعد NOVA..." disabled={chatLoading} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}/><button onClick={sendChat} disabled={chatLoading||!chat.trim()} aria-label="إرسال الرسالة"><Send size={17}/></button></div>
        <div className="secure-note">المساعد يحتاج إعداد OPENAI_API_KEY على الخادم. لا تضع المفتاح داخل التطبيق.</div>
      </aside>
    </div>
    <footer className="statusbar"><span><i className="status-dot"/> جاهز للعمل</span><span>NOVA · محرر فيديو</span><span>واجهة عربية · 16:9</span></footer>
  </div>
}
