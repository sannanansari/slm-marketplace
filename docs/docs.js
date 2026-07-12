/* docs.js — shared JS for all documentation pages */

const DOC_INDEX=[
  {t:"What is an SLM?",u:"../getting-started/",s:"Getting Started",i:"🌐"},
  {t:"SLM vs LLM",u:"../getting-started/slm-vs-llm.html",s:"Getting Started",i:"⚖️"},
  {t:"Use Cases",u:"../getting-started/use-cases.html",s:"Getting Started",i:"💼"},
  {t:"Popular Open-Source SLMs",u:"../getting-started/popular-slms.html",s:"Getting Started",i:"⭐"},
  {t:"AI Foundations Overview",u:"../foundations/",s:"Foundations",i:"🔬"},
  {t:"Transformers Explained",u:"../foundations/transformers.html",s:"Foundations",i:"🔬"},
  {t:"Tokens & Tokenization",u:"../foundations/tokens.html",s:"Foundations",i:"🔤"},
  {t:"LoRA & QLoRA",u:"../foundations/lora.html",s:"Foundations",i:"⚡"},
  {t:"Quantization Basics",u:"../foundations/quantization.html",s:"Foundations",i:"💾"},
  {t:"Learning Roadmap",u:"../roadmap/",s:"Roadmap",i:"🗺️"},
  {t:"Setup Overview",u:"../setup/",s:"Setup",i:"⚙️"},
  {t:"Windows Setup",u:"../setup/windows.html",s:"Setup",i:"🪟"},
  {t:"macOS Setup",u:"../setup/macos.html",s:"Setup",i:"🍎"},
  {t:"Linux Setup",u:"../setup/linux.html",s:"Setup",i:"🐧"},
  {t:"Google Colab Setup",u:"../setup/colab.html",s:"Setup",i:"☁️"},
  {t:"RunPod Setup",u:"../setup/runpod.html",s:"Setup",i:"🚀"},
  {t:"GPU Recommendations",u:"../setup/gpu-guide.html",s:"Setup",i:"🎮"},
  {t:"Tools Directory",u:"../tools/",s:"Tools",i:"🔧"},
  {t:"Build Your First SLM",u:"../tutorials/",s:"Tutorial",i:"🏗️"},
  {t:"Fine-Tuning Overview",u:"../fine-tuning/",s:"Fine-Tuning",i:"⚡"},
  {t:"LoRA Fine-Tuning",u:"../fine-tuning/lora.html",s:"Fine-Tuning",i:"⚡"},
  {t:"QLoRA Fine-Tuning",u:"../fine-tuning/qlora.html",s:"Fine-Tuning",i:"🔋"},
  {t:"Unsloth Fine-Tuning",u:"../fine-tuning/unsloth.html",s:"Fine-Tuning",i:"🦥"},
  {t:"Instruction Tuning",u:"../fine-tuning/instruction.html",s:"Fine-Tuning",i:"📖"},
  {t:"Dataset Academy",u:"../datasets/",s:"Datasets",i:"📦"},
  {t:"Dataset Collection",u:"../datasets/collection.html",s:"Datasets",i:"📦"},
  {t:"Synthetic Data",u:"../datasets/synthetic.html",s:"Datasets",i:"🤖"},
  {t:"Data Cleaning",u:"../datasets/cleaning.html",s:"Datasets",i:"🧹"},
  {t:"Evaluation Academy",u:"../evaluation/",s:"Evaluation",i:"📊"},
  {t:"Metrics — Accuracy, F1",u:"../evaluation/metrics.html",s:"Evaluation",i:"📊"},
  {t:"Hallucination Testing",u:"../evaluation/hallucination.html",s:"Evaluation",i:"👻"},
  {t:"Quantization Academy",u:"../quantization/",s:"Quantization",i:"💾"},
  {t:"GGUF Quantization",u:"../quantization/gguf.html",s:"Quantization",i:"📦"},
  {t:"GPTQ Quantization",u:"../quantization/gptq.html",s:"Quantization",i:"⚡"},
  {t:"AWQ Quantization",u:"../quantization/awq.html",s:"Quantization",i:"🔬"},
  {t:"Inference Academy",u:"../inference/",s:"Inference",i:"🚀"},
  {t:"Ollama Setup Guide",u:"../inference/ollama.html",s:"Inference",i:"🦙"},
  {t:"vLLM Production Guide",u:"../inference/vllm.html",s:"Inference",i:"⚡"},
  {t:"llama.cpp Guide",u:"../inference/llamacpp.html",s:"Inference",i:"🔧"},
  {t:"Deployment Academy",u:"../deployment/",s:"Deployment",i:"☁️"},
  {t:"Deploy on RunPod",u:"../deployment/runpod.html",s:"Deployment",i:"🚀"},
  {t:"Deploy on Modal",u:"../deployment/modal.html",s:"Deployment",i:"☁️"},
  {t:"RAG Academy",u:"../rag/",s:"RAG",i:"🔍"},
  {t:"Real-World Projects",u:"../projects/",s:"Projects",i:"🏗️"},
  {t:"Medical SLM Project",u:"../projects/medical.html",s:"Projects",i:"🏥"},
  {t:"Legal SLM Project",u:"../projects/legal.html",s:"Projects",i:"⚖️"},
  {t:"Coding SLM Project",u:"../projects/coding.html",s:"Projects",i:"💻"},
  {t:"Finance SLM Project",u:"../projects/finance.html",s:"Projects",i:"📈"},
  {t:"GPU Hardware Guide",u:"../hardware/",s:"Hardware",i:"🎮"},
  {t:"Cost Guide",u:"../costs/",s:"Costs",i:"💰"},
  {t:"Publishing Guide",u:"../publishing/",s:"Publishing",i:"📤"},
  {t:"Best Practices",u:"../best-practices/",s:"Best Practices",i:"🛡️"},
  {t:"Troubleshooting",u:"../troubleshooting/",s:"Troubleshooting",i:"🔴"},
  {t:"CUDA Out of Memory",u:"../troubleshooting/cuda-oom.html",s:"Troubleshooting",i:"🔴"},
  {t:"Ollama Issues",u:"../troubleshooting/ollama.html",s:"Troubleshooting",i:"🦙"},
];

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function hl(t,q){const i=t.toLowerCase().indexOf(q);if(i<0)return esc(t);return esc(t.slice(0,i))+'<mark style="background:#FEF3C7;color:#92400E;border-radius:2px">'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length))}

function initSearch(){
  const inp=document.getElementById('docs-search');
  const res=document.getElementById('search-results');
  if(!inp||!res)return;
  inp.addEventListener('input',function(){
    const q=this.value.trim().toLowerCase();
    if(!q){res.classList.remove('open');return}
    const hits=DOC_INDEX.filter(d=>d.t.toLowerCase().includes(q)||d.s.toLowerCase().includes(q)).slice(0,8);
    res.innerHTML=hits.length?hits.map(m=>`<a class="search-result-item" href="${m.u}"><span class="search-result-icon">${m.i}</span><div><div class="search-result-title">${hl(m.t,q)}</div><div class="search-result-section">${m.s}</div></div></a>`).join(''):'<div class="search-no-results">No results</div>';
    res.classList.add('open');
  });
  document.addEventListener('click',e=>{if(!inp.contains(e.target)&&!res.contains(e.target))res.classList.remove('open')});
  inp.addEventListener('keydown',e=>{if(e.key==='Escape'){res.classList.remove('open');inp.blur()}});
  document.addEventListener('keydown',e=>{if((e.key==='/'||(e.key==='k'&&(e.metaKey||e.ctrlKey)))&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();inp.focus()}});
}

function initTabs(){
  document.querySelectorAll('.tab-nav').forEach(nav=>{
    nav.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const g=btn.closest('.tab-group');if(!g)return;
        g.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        g.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active');
        const panel=g.querySelector('#'+btn.dataset.tab);if(panel)panel.classList.add('active');
      });
    });
  });
}

function initCodeCopy(){
  document.querySelectorAll('.code-copy-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const pre=btn.closest('.code-block')?.querySelector('pre');if(!pre)return;
      navigator.clipboard.writeText(pre.textContent.trim()).then(()=>{
        const o=btn.textContent;btn.textContent='✓ Copied!';btn.style.color='#86EFAC';
        setTimeout(()=>{btn.textContent=o;btn.style.color=''},2000);
      }).catch(()=>{btn.textContent='Failed';setTimeout(()=>{btn.textContent='Copy'},2000)});
    });
  });
}

function initTOC(){
  const links=document.querySelectorAll('.toc-link');
  const heads=document.querySelectorAll('h2[id],h3[id]');
  if(!links.length||!heads.length)return;
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.remove('active'));const a=document.querySelector('.toc-link[href="#'+e.target.id+'"]');if(a)a.classList.add('active')}});
  },{rootMargin:'-80px 0px -70% 0px'});
  heads.forEach(h=>obs.observe(h));
}

function initFAQ(){
  document.querySelectorAll('.faq-q').forEach(q=>{
    q.addEventListener('click',()=>q.parentElement.classList.toggle('open'));
  });
}

function initMobile(){
  const btn=document.getElementById('mobile-menu-btn');
  const sb=document.querySelector('.docs-sidebar');
  if(!btn||!sb)return;
  const ov=document.createElement('div');
  ov.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:140';
  document.body.appendChild(ov);
  btn.addEventListener('click',()=>{const o=sb.classList.toggle('open');ov.style.display=o?'block':'none'});
  ov.addEventListener('click',()=>{sb.classList.remove('open');ov.style.display='none'});
}

function initProgress(){
  const bar=document.getElementById('reading-progress');if(!bar)return;
  window.addEventListener('scroll',()=>{const t=document.documentElement.scrollHeight-window.innerHeight;bar.style.width=t>0?(window.scrollY/t*100)+'%':'0%'},{passive:true});
}

document.addEventListener('DOMContentLoaded',()=>{
  initSearch();initTabs();initCodeCopy();initTOC();initFAQ();initMobile();initProgress();
});

/* ═══════════════════════════════════════════════════
   ADDITIONS — FAQ toggles, Tab groups,
   reading progress, keyboard shortcuts fix
═══════════════════════════════════════════════════ */

/* ── FAQ Toggles ─────────────────────────────── */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = btn.closest('.faq-item');
      var isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item').forEach(function(el) {
        el.classList.remove('open');
      });
      // Toggle clicked
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ── Tab Groups ──────────────────────────────── */
function initTabGroups() {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = btn.closest('.tab-group');
      if (!group) return;
      var tabId = btn.dataset.tab;

      // Deactivate all buttons and panels in this group
      group.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      group.querySelectorAll('.tab-panel').forEach(function(p) {
        p.classList.remove('active');
        p.setAttribute('aria-hidden', 'true');
      });

      // Activate clicked
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      var panel = group.querySelector('#' + tabId);
      if (panel) {
        panel.classList.add('active');
        panel.setAttribute('aria-hidden', 'false');
      }
    });
  });
}

/* ── Reading Progress Bar ────────────────────── */
function initReadingProgress() {
  var bar = document.getElementById('reading-progress');
  if (!bar) return;

  function updateProgress() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

/* ── Init all on DOM ready ───────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initFAQ();
  initTabGroups();
  initReadingProgress();
});
