import React, { useMemo, useRef, useState } from 'react'
import {
  Film, Music2, Type, Sticker, Sparkles, Scissors, SlidersHorizontal,
  LayoutTemplate, FolderOpen, Upload, Play, Pause, SkipBack, SkipForward,
  Plus, Minus, Undo2, Redo2, Trash2, Download, Settings, HelpCircle,
  MessageCircle, WandSparkles, Captions, Languages, Video, Image as ImageIcon,
  Volume2, X, Send, Bot, Clock3, ChevronDown
} from 'lucide-react'

const nav = [
  [FolderOpen,'الوسائط'],[Music2,'الصوت'],[Type,'النص'],[Sticker,'الملصقات'],
  [Sparkles,'التأثيرات'],[Scissors,'الانتقالات'],[SlidersHorizontal,'الفلاتر'],[LayoutTemplate,'القوالب']
]

function fmt(seconds=0) {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

export default function App() {
  const [assets,setAssets] = useState([])
  const [selected,setSelected] = useState(null)
  const [playing,setPlaying] = useState(false)
  const [duration,setDuration] = useState(0)
  const [current,setCurrent] = useState(0)
  const [chat,setChat] = useState('')
  const [messages,setMessages] = useState([{role:'assistant', text:'أهلاً بيك في NOVA STUDIO AI 👋\\nأنا مساعدك في المونتاج. اكتبلي عايز تعمل إيه، أو اطلب مني فكرة وسيناريو للفيديو.'}])
  const [activeTool,setActiveTool] = useState('الوسائط')
  const [zoom,setZoom] = useState(1)
  const videoRef = useRef(null)
  const active = assets.find(a => a.id === selected) || assets.find(a => a.type === 'video')
  const isVideo = active?.type === 'video'

  const addFiles = async (files) => {
    const arr = Array.from(files || []).map(file => {
      const url = URL.createObjectURL(file)
      const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'
      return { id: crypto.randomUUID(), name:file.name, url, type, file, duration: type==='image'?5:0 }
    })
    setAssets(prev => [...prev, ...arr])
    const firstVideo = arr.find(x=>x.type==='video') || arr[0]
    if (firstVideo) setSelected(firstVideo.id)
  }

  const importFromDesktop = async () => {
    if (window.nova?.openMedia) {
      const paths = await window.nova.openMedia()
      const arr = paths.map(p => {
        const name = p.split(/[\\\\/]/).pop()
        const ext = name.split('.').pop().toLowerCase()
        const type = ['mp4','mov','mkv','webm'].includes(ext) ? 'video' : ['mp3','wav','m4a'].includes(ext) ? 'audio' : 'image'
        return { id:crypto.randomUUID(), name, url: `file://${p.replace(/\\\\/g,'/')}`, type, duration: type==='image'?5:0 }
      })
      setAssets(prev=>[...prev,...arr])
      if(arr[0]) setSelected(arr[0].id)
    } else {
      document.getElementById('fileInput')?.click()
    }
  }

  const onMeta = (e) => {
    const d = e.currentTarget.duration || 0
    setDuration(d)
    setCurrent(0)
  }

  const togglePlay = async () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { try { await videoRef.current.play(); setPlaying(true) } catch {} }
  }

  const seek = (value) => {
    setCurrent(Number(value))
    if(videoRef.current) videoRef.current.currentTime = Number(value)
  }

  const sendChat = () => {
    const prompt = chat.trim()
    if(!prompt) return
    setMessages(prev=>[...prev,{role:'user',text:prompt},{role:'assistant',text:'وصل طلبك! في النسخة الحالية أقدر أساعدك بالأفكار والسيناريو وخطة المونتاج. ربط تنفيذ أوامر الذكاء الاصطناعي مباشرة بالمشروع يحتاج إضافة مفتاح OpenAI API آمن في مرحلة الربط، ولن نضع المفتاح داخل واجهة البرنامج.'}])
    setChat('')
  }

  const removeAsset = (id) => {
    const item=assets.find(a=>a.id===id)
    if(item?.url?.startsWith('blob:')) URL.revokeObjectURL(item.url)
    setAssets(prev=>prev.filter(a=>a.id!==id))
    if(selected===id) setSelected(null)
  }

  const totalDuration = useMemo(()=>Math.max(duration, ...assets.map(a=>a.duration||0), 15),[duration,assets])

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Film size={22}/></div><span>NOVA <b>STUDIO</b></span><small>AI</small></div>
      <div className="project-name">مشروع بدون عنوان <ChevronDown size={14}/></div>
      <div className="top-actions"><button className="icon-btn"><Undo2/></button><button className="icon-btn"><Redo2/></button><span className="divider-v"/><button className="icon-btn"><HelpCircle/></button><button className="icon-btn"><Settings/></button><button className="export" onClick={()=>alert('التصدير الفعلي للفيديو سيتم تفعيله في المرحلة التالية بعد دمج FFmpeg.') }><Download size={17}/> تصدير</button></div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        {nav.map(([Icon,label])=><button key={label} className={`nav-item ${activeTool===label?'active':''}`} onClick={()=>setActiveTool(label)}><Icon size={21}/><span>{label}</span></button>)}
      </aside>

      <section className="media-panel panel">
        <div className="panel-tabs"><button className="tab active">المشروع</button><button className="tab">المكتبة</button><button className="tab">مولّد AI</button></div>
        <div className="media-heading"><b>{activeTool}</b><button className="small-btn" onClick={importFromDesktop}><Plus size={15}/> استيراد</button></div>
        <button className="import-box" onClick={importFromDesktop}><Upload size={24}/><b>استيراد الوسائط</b><span>فيديوهات، صور، وملفات صوت</span></button>
        <input id="fileInput" type="file" multiple accept="video/*,audio/*,image/*" hidden onChange={e=>addFiles(e.target.files)}/>
        <div className="asset-grid">
          {assets.map(a=><div key={a.id} className={`asset ${selected===a.id?'chosen':''}`} onClick={()=>setSelected(a.id)}>
            <div className="asset-thumb">{a.type==='video'?<Video/>:a.type==='audio'?<Music2/>:<ImageIcon/>}<button className="asset-remove" onClick={e=>{e.stopPropagation();removeAsset(a.id)}}><X size={12}/></button></div>
            <span title={a.name}>{a.name}</span>
          </div>)}
        </div>
        {assets.length===0 && <div className="empty-hint">ملفاتك المستوردة هتظهر هنا</div>}
      </section>

      <main className="center">
        <div className="preview panel">
          <div className="preview-head"><span>المعاينة</span><span className="muted">مشغل الفيديو <ChevronDown size={13}/></span></div>
          <div className="preview-stage">
            {active?.type==='video' ? <video ref={videoRef} src={active.url} onLoadedMetadata={onMeta} onTimeUpdate={e=>setCurrent(e.currentTarget.currentTime)} onEnded={()=>setPlaying(false)} /> :
             active?.type==='image' ? <img src={active.url} /> :
             <div className="preview-placeholder"><Film size={52}/><b>{active?.type==='audio'?'ملف صوتي محدد':'ابدأ مشروعك باستيراد فيديو أو صورة'}</b><span>معاينة مشروع NOVA STUDIO AI</span></div>}
          </div>
          <div className="player-controls">
            <span className="timecode">{fmt(current)} <i>/</i> {fmt(duration)}</span>
            <div className="transport"><button onClick={()=>seek(0)}><SkipBack size={17}/></button><button className="play" onClick={togglePlay}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button onClick={()=>seek(duration)}><SkipForward size={17}/></button></div>
            <span className="ratio">16:9 <ChevronDown size={12}/></span>
          </div>
        </div>

        <div className="timeline panel">
          <div className="timeline-toolbar">
            <div className="tool-group"><button title="قص"><Scissors/></button><button title="حذف"><Trash2/></button><button title="إضافة"><Plus/></button></div>
            <div className="tool-group"><button onClick={()=>setZoom(z=>Math.max(.5,z-.1))}><Minus/></button><span className="zoom-label">{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(2,z+.1))}><Plus/></button></div>
          </div>
          <div className="ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span></div>
          <div className="tracks">
            <div className="track-label"><Film size={15}/> فيديو</div>
            <div className="track-content">
              {assets.filter(a=>a.type==='video'||a.type==='image').map((a,i)=><button key={a.id} className={`clip ${selected===a.id?'selected':''}`} style={{width:`${Math.max(110,(a.duration||5)*18*zoom)}px`}} onClick={()=>setSelected(a.id)}>{a.type==='image'?<ImageIcon size={14}/>:<Film size={14}/>}<span>{a.name}</span></button>)}
            </div>
            <div className="track-label"><Music2 size={15}/> صوت</div>
            <div className="track-content audio-track">{assets.filter(a=>a.type==='audio').map(a=><button key={a.id} className="audio-clip" onClick={()=>setSelected(a.id)}><Volume2 size={14}/>{a.name}</button>)}</div>
          </div>
          <div className="playhead" style={{left:`${Math.min(95,(current/Math.max(totalDuration,1))*100)}%`}}/>
          <div className="timeline-footer"><span>المسارات</span><span>اسحب الملفات إلى مساحة التايم لاين في الإصدارات القادمة</span></div>
        </div>
      </main>

      <aside className="ai-panel panel">
        <div className="ai-header"><div className="ai-logo"><Bot size={22}/></div><div><b>مساعد NOVA AI</b><span>مدعوم بتكامل ChatGPT لاحقاً</span></div><span className="online-dot"/></div>
        <div className="ai-intro"><div className="orb"><WandSparkles size={26}/></div><h3>خلّي الذكاء الاصطناعي يساعدك</h3><p>اكتب طلبك للحصول على أفكار وسيناريو وخطة مونتاج.</p></div>
        <div className="quick-actions">
          <button onClick={()=>setChat('اقترح فكرة ريلز جذابة مدتها 30 ثانية')}><Sparkles/> اقتراح فكرة فيديو</button>
          <button onClick={()=>setChat('اكتب سيناريو قصير للفيديو')}><Type/> كتابة سيناريو</button>
          <button onClick={()=>setChat('اقترح ترتيب اللقطات والانتقالات')}><Scissors/> خطة مونتاج</button>
          <button onClick={()=>setChat('اكتب ترجمة وعناوين مناسبة للفيديو')}><Captions/> عناوين وترجمة</button>
        </div>
        <div className="chat-messages">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><span className="message-icon">{m.role==='assistant'?<Bot size={15}/>:<MessageCircle size={15}/>}</span><p>{m.text}</p></div>)}</div>
        <div className="chat-compose"><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="اكتب طلبك هنا..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}}}/><button onClick={sendChat}><Send size={17}/></button></div>
        <div className="secure-note">ربط ChatGPT الحقيقي يتطلب إعداد API آمن وموافقتك على أي تكلفة استخدام.</div>
      </aside>
    </div>
    <footer className="statusbar"><span><i className="status-dot"/> جاهز للعمل</span><span>NOVA STUDIO AI · الإصدار التجريبي 0.1</span><span>واجهة عربية · 16:9</span></footer>
  </div>
}
