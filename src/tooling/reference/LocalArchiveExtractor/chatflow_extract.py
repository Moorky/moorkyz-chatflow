#!/usr/bin/env python3
"""Local ChatGPT conversation extractor. Python 3.10+, standard library only."""
import argparse, csv, datetime as dt, hashlib, html, json, re, zipfile, pathlib, webbrowser

def load(p):
    if p.suffix.lower()=='.zip':
        with zipfile.ZipFile(p) as z:
            names=[n for n in z.namelist() if pathlib.PurePosixPath(n).name=='conversations.json' or re.fullmatch(r'conversations-\d+\.json',pathlib.PurePosixPath(n).name)]
            if not names: raise ValueError('No conversations JSON in ZIP')
            result=[]
            for n in names:
                v=json.loads(z.read(n)); result.extend(v if isinstance(v,list) else [v])
            return result
    v=json.loads(p.read_text(encoding='utf-8-sig')); return v if isinstance(v,list) else [v]

def stamp(t):
    try: return dt.datetime.fromtimestamp(float(t),dt.timezone.utc).isoformat() if t is not None else None
    except (ValueError,TypeError,OverflowError): return None

def blocks(s):
    out=[]; pos=0
    for m in re.finditer(r'(?ms)^\s*(`{3,}|~{3,})([^\n]*)\n(.*?)^\s*\1[^\n]*(?:\n|$)',s):
        if m.start()>pos: out.extend(prose(s[pos:m.start()]))
        lang=m.group(2).strip(); out.append({'type':'diagram' if lang.lower()=='mermaid' else 'code_block','subtype':lang or None,'content':m.group(0)}) ; pos=m.end()
    if pos<len(s): out.extend(prose(s[pos:]))
    return out

def prose(s):
    if not s: return []
    types=[]
    if re.search(r'(?m)^\s*#{1,6}\s+',s): types.append('heading')
    if re.search(r'(?m)^\s*(?:[-*+] |\d+\. )',s): types.append('list')
    if re.search(r'(?m)^\s*\|.*\|\s*$',s): types.append('table')
    if re.search(r'(?m)^\s*>',s): types.append('blockquote')
    if re.search(r'`[^`\n]+`',s): types.append('inline_code')
    if re.search(r'!?\[[^\]]*\]\([^\n)]+\)',s): types.append('link')
    if re.search(r'!\[[^\]]*\]\(',s): types.append('image_reference')
    if re.search(r'\*\*.+?\*\*|__.+?__',s): types.append('bold')
    if re.search(r'(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)',s): types.append('italic')
    if re.search(r'\$\$|\\\[|\\\(',s): types.append('math')
    if re.search(r'<(?:svg|chart|img)\b',s,re.I): types.append('graphic_markup')
    return [{'type':'markdown' if types else 'text','features':types,'content':s}]

def extract(c):
    mapping=c.get('mapping') or {}; current=c.get('current_node'); path=[]; seen=set(); warnings=[]
    while current and current in mapping and current not in seen:
        seen.add(current); path.append(current); current=mapping[current].get('parent')
    path.reverse()
    if not path:
        warnings.append('No active branch pointer; using timestamp order, not guaranteed conversation order.')
        path=sorted(mapping,key=lambda k: (mapping[k].get('message') or {}).get('create_time') or 0)
    allrows=[]; active=[]
    for k in list(dict.fromkeys(path+list(mapping))):
        node=mapping[k]; m=node.get('message')
        if not m: continue
        a=m.get('author') or {}; content=m.get('content') or {}; meta=m.get('metadata') or {}; parts=content.get('parts') or []
        bs=[]; texts=[]
        for part in parts:
            if isinstance(part,str): texts.append(part); bs.extend(blocks(part))
            elif isinstance(part,dict):
                typ=part.get('content_type') or part.get('type') or 'unknown_part'; bs.append({'type':typ,'content':part})
            else: bs.append({'type':'unknown_part','content':part})
        if not parts and isinstance(content.get('text'),str): texts.append(content['text']); bs.extend(blocks(content['text']))
        elif not parts and content: bs.append({'type':content.get('content_type','unknown_content'),'content':content})
        text='\n'.join(texts); types=sorted({t for b in bs for t in [b['type']]+b.get('features',[])})
        t=m.get('create_time'); row={'conversation_id':c.get('id') or c.get('conversation_id'),'message_id':m.get('id') or k,'node_id':k,'parent_id':node.get('parent'),'role':a.get('role','unknown'),'author_label':a.get('name') or a.get('role','unknown'),'timestamp':stamp(t),'updated_at':stamp(m.get('update_time')),'epoch':t,'active_branch':k in seen or (not seen and k in path),'hidden':bool(meta.get('is_visually_hidden_from_conversation')),'content_raw':content,'content_text':text,'length_chars':len(text),'length_words':len(text.split()),'length_tokens_estimate':(len(text)+3)//4,'content_types':types,'blocks':bs,'attachments':meta.get('attachments') or [],'model':meta.get('model_slug'),'sha256':hashlib.sha256(json.dumps(content,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'raw_message':m}
        allrows.append(row)
        if k in path: active.append(row)
    prev=None; last_user=None
    for i,r in enumerate(active,1):
        t=r['epoch']; r['sequence']=i; r['delta_ms']=round((t-prev)*1000) if isinstance(t,(int,float)) and isinstance(prev,(int,float)) else None
        r['response_latency_ms']=None; r['generation_duration_ms']=None
        if r['role']=='user': last_user=t
        elif r['role']=='assistant' and isinstance(t,(int,float)) and isinstance(last_user,(int,float)): r['response_latency_ms']=round((t-last_user)*1000); last_user=None
        prev=t
    for r in allrows:
        if 'sequence' not in r: r.update(sequence=None,delta_ms=None,response_latency_ms=None,generation_duration_ms=None)
    return allrows,warnings

PAGE='''<!doctype html><meta charset="utf-8"><title>chatflow · context composer</title><style>body{font:15px system-ui;max-width:1200px;margin:30px auto;padding:0 16px;background:#111827;color:#e5e7eb}input,select,button{font:inherit;padding:9px;margin:4px;background:#1f2937;color:inherit;border:1px solid #64748b;border-radius:6px}article{border:1px solid #374151;padding:14px;margin:10px 0;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#9ca3af}label{cursor:pointer}button{cursor:pointer}header{position:sticky;top:0;background:#111827;padding:10px 0;z-index:1}</style><h1>chatflow / context composer</h1><p>Local only. Filter, select, reorder and export original message text. Asset references are metadata, not downloaded media.</p><header><input id="q" placeholder="Search text / ID"><select id="role"><option value="">All roles</option></select><select id="type"><option value="">All types</option></select><label><input id="all" type="checkbox">Include other branches / hidden</label><br><input id="from" type="date"><input id="to" type="date"><select id="order"><option value="seq">Conversation order</option><option value="reverse">Reverse order</option><option value="long">Longest first</option></select><button id="select">Select filtered</button><button id="clear">Clear selection</button><button id="export">Export selected Markdown</button><button id="json">Export selected JSON</button><p id="stats"></p></header><main id="list"></main><script id="data" type="application/json">__DATA__</script><script>
const rows=JSON.parse(document.getElementById('data').textContent), $=id=>document.getElementById(id), picked=new Set(); let visible=[];
for(const [id,vals] of [['role',rows.map(r=>r.role)],['type',rows.flatMap(r=>r.content_types)]])for(const v of [...new Set(vals)].sort()){let o=document.createElement('option');o.value=o.textContent=v;$(id).append(o)}
function render(){let q=$('q').value.toLowerCase();visible=rows.filter(r=>($('all').checked||(r.active_branch&&!r.hidden))&&(!$('role').value||r.role===$('role').value)&&(!$('type').value||r.content_types.includes($('type').value))&&(!q||(r.content_text+' '+r.message_id+' '+r.content_types.join(' ')).toLowerCase().includes(q))&&(!$('from').value||(r.timestamp||'').slice(0,10)>=$('from').value)&&(!$('to').value||(r.timestamp||'').slice(0,10)<=$('to').value));if($('order').value==='reverse')visible.reverse();if($('order').value==='long')visible.sort((a,b)=>b.length_chars-a.length_chars);$('list').replaceChildren();for(const r of visible){let a=document.createElement('article'),l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=picked.has(r.node_id);c.onchange=()=>{c.checked?picked.add(r.node_id):picked.delete(r.node_id);stats()};l.append(c,` ${r.sequence??'branch'} · ${r.author_label} · ${r.timestamp??'unknown'}`);let meta=document.createElement('small');meta.textContent=`${r.length_chars} chars · ~${r.length_tokens_estimate} tokens · Δ ${r.delta_ms??'—'} ms · ${r.content_types.join(', ')}`;let p=document.createElement('pre');p.textContent=r.content_text||JSON.stringify(r.content_raw,null,2);a.append(l,document.createElement('br'),meta,p);$('list').append(a)}stats()}
function chosen(){let a=rows.filter(r=>picked.has(r.node_id));if($('order').value==='reverse')a.reverse();if($('order').value==='long')a.sort((x,y)=>y.length_chars-x.length_chars);return a}function stats(){let a=chosen();$('stats').textContent=`${visible.length} visible / ${rows.length} total · ${a.length} selected · ~${a.reduce((s,r)=>s+r.length_tokens_estimate,0)} text tokens`}
function save(name,body,mime){let u=URL.createObjectURL(new Blob([body],{type:mime}));let a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
for(const id of ['q','role','type','all','from','to','order'])$(id).addEventListener('input',render);$('select').onclick=()=>{visible.forEach(r=>picked.add(r.node_id));render()};$('clear').onclick=()=>{picked.clear();render()};$('export').onclick=()=>save('context.md',chosen().map(r=>`## ${r.role} | ${r.timestamp??'unknown'} | ${r.message_id}\\n\\n${r.content_text||JSON.stringify(r.content_raw)} `).join('\\n\\n---\\n\\n'),'text/markdown');$('json').onclick=()=>save('context.json',JSON.stringify(chosen(),null,2),'application/json');render();</script>'''

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('source',type=pathlib.Path); ap.add_argument('--chat',help='Exact ID or title substring'); ap.add_argument('--out',type=pathlib.Path,default=pathlib.Path('chatflow-output')); ap.add_argument('--no-open',action='store_true'); args=ap.parse_args(); cs=load(args.source)
    if args.chat:
        q=args.chat; matches=[c for c in cs if q in [c.get('id'),c.get('conversation_id')]] or [c for c in cs if q.casefold() in (c.get('title') or '').casefold()]
    else: matches=cs
    if not matches: raise SystemExit('No matching conversation')
    if len(matches)>1:
        for i,c in enumerate(matches,1): print(f"{i}: {c.get('title')} [{c.get('id') or c.get('conversation_id')}]")
        i=int(input('Select conversation number: '));
        if not 1<=i<=len(matches): raise SystemExit('Invalid selection')
        c=matches[i-1]
    else: c=matches[0]
    rows,warnings=extract(c); args.out.mkdir(parents=True,exist_ok=True); out=args.out
    (out/'conversation.raw.json').write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8'); (out/'messages.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    fields=['sequence','message_id','parent_id','role','author_label','timestamp','delta_ms','response_latency_ms','generation_duration_ms','length_chars','length_words','length_tokens_estimate','content_types','active_branch','hidden','content_text','sha256']
    with (out/'messages.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
    (out/'conversation.md').write_text('\n\n---\n\n'.join(f"## {r['role']} | {r['timestamp']} | {r['message_id']}\n\n{r['content_text']}" for r in rows if r['active_branch'] and not r['hidden']),encoding='utf-8')
    (out/'report.json').write_text(json.dumps({'title':c.get('title'),'messages':len(rows),'active_visible':sum(r['active_branch'] and not r['hidden'] for r in rows),'warnings':warnings,'token_estimate_method':'ceil(text characters / 4), not tokenizer','assets':'references only'},indent=2),encoding='utf-8')
    payload=json.dumps(rows,ensure_ascii=False).replace('<','\\u003c'); page=out/'composer.html';page.write_text(PAGE.replace('__DATA__',payload),encoding='utf-8'); print(f'Extracted {len(rows)} messages to {out.resolve()}');print('\n'.join(warnings));
    if not args.no_open: webbrowser.open(page.resolve().as_uri())
if __name__=='__main__': main()
