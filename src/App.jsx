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
    const result=`أنشئ فيديو ${videoStyle} بجودة سينمائية.\nالوصف: ${videoPrompt.trim()}\nالمدة: ${videoDuration} ثوانٍ.\nالأبعاد: ${videoRatio}.\nتقسيم المشاهد: ${videoScenes}.\nحافظ على ثبات شكل الشخصيات والألوان والإضاءة بين اللقطات، مع حركة طبيعية للكاميرا والشخصيات، وتفاصيل واضحة ومناسبة للنشر.`
    setPreparedPrompt(result)
  }
  const copyPreparedPrompt=async()=>{
    if(!preparedPrompt)return
    try{await navigator.clipboard.writeText(preparedPrompt);alert('تم نسخ البرومبت.')}catch{alert('تعذر النسخ تلقائياً؛ يمكنك تحديد النص ونسخه.')}
  }
  const sendChat=()=>{
    if(!chat.trim())return
    setChat('')
    alert('مساعد NOVA: أقدر أجهز لك فكرة وسيناريو وخطة مونتاج. تنفيذ أوامر الذكاء الاصطناعي تلقائياً يحتاج ربط خدمة API آمنة.')
  }
  useEffect(()=>{if(videoRef.current)videoRef.current.volume=volume},[volume,activeAsset?.id])
  const previewSource=activeAsset?.url
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Film size={22}/></div><span>NOVA <b>STUDIO</b></span><small>AI</small></div>
      <div className="project-name">مشروع بدون عنوان <ChevronDown size={14}/></div>
      <div className="top-actions"><button className="icon-btn" title="تراجع"><Undo2/></button><button className="icon-btn" title="إعادة"><Redo2/></button><span className="divider-v"/><button className="icon-btn"><HelpCircle/></button><button className="icon-btn"><Settings/></button><button className="export" onClick={()=>alert('التصدير النهائي لكل المسارات قيد التطوير. تقدر حالياً تستورد وتقُص وتقسم وترتب المقاطع داخل التايم لاين.') }><Download size={17}/> تصدير</button></div>
    </header>
    <div className="workspace">
      <aside className="sidebar">{nav.map(([Icon,label])=><button key={label} className={`nav-item ${activeTool===label?'active':''}`} onClick={()=>setActiveTool(label)}><Icon size={21}/><span>{label}</span></button>)}</aside>
      <section className="media-panel panel">
        <div className="panel-tabs"><button className={`tab ${activeTool!=='مولّد AI'?'active':''}`} onClick={()=>setActiveTool('الوسائط')}>المشروع</button><button className="tab" onClick={()=>setActiveTool('المكتبة')}>المكتبة</button><button className={`tab ${activeTool==='مولّد AI'?'active':''}`} onClick={()=>setActiveTool('مولّد AI')}>مولّد AI</button></div>
        {activeTool==='مولّد AI'?<div className="video-generator">
          <div className="generator-title"><WandSparkles size={20}/><div><b>إنشاء فيديو بالذكاء الاصطناعي</b><span>اكتب وصف المشهد وحدد شكل الفيديو</span></div></div>
          <label>وصف الفيديو (Prompt)</label>
          <textarea className="generator-prompt" value={videoPrompt} onChange={e=>setVideoPrompt(e.target.value)} placeholder="مثال: أرنب صغير يجري في غابة سحرية، والكاميرا تتبعه بين الأشجار..."/>
          <label>ستايل الفيديو</label>
          <div className="generator-options">{['3D كرتون','أنمي','واقعي سينمائي','رسوم 2D'].map(s=><button key={s} className={videoStyle===s?'chosen':''} onClick={()=>setVideoStyle(s)}>{s}</button>)}</div>
          <div className="generator-fields">
            <div><label>المقاس</label><select value={videoRatio} onChange={e=>setVideoRatio(e.target.value)}><option>9:16</option><option>16:9</option></select></div>
            <div><label>المدة</label><select value={videoDuration} onChange={e=>setVideoDuration(e.target.value)}><option value="5">5 ثوانٍ</option><option value="10">10 ثوانٍ</option><option value="15">15 ثانية</option></select></div>
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
        <div className="chat-messages"><div className="message assistant"><span className="message-icon"><Bot size={15}/></span><p>أهلاً بيك! استورد الفيديو، أضفه للتايم لاين، وبعدها تقدر تحدد المقطع وتقُصه أو تقسّمه.</p></div></div>
        <div className="chat-compose"><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="اطلب فكرة أو سيناريو..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}/><button onClick={sendChat}><Send size={17}/></button></div>
        <div className="secure-note">التصدير المتقدم والذكاء الاصطناعي المتصل سيتم إضافتهما في مراحل لاحقة.</div>
      </aside>
    </div>
    <footer className="statusbar"><span><i className="status-dot"/> جاهز للعمل</span><span>NOVA STUDIO AI · محرر تجريبي</span><span>واجهة عربية · 16:9</span></footer>
  </div>
}
