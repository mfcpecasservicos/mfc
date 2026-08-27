(function(){
  'use strict';
  const OWNER_KEY='mfc-layout-owner-v1';
  const ACTIVE_KEY='mfc-layout-active-v1';
  const url=new URL(location.href);
  const command=url.searchParams.get('mfc_layout');
  if(command==='1')localStorage.setItem(OWNER_KEY,'1');
  if(command==='0'){localStorage.removeItem(OWNER_KEY);localStorage.removeItem(ACTIVE_KEY)}
  if(command!==null){url.searchParams.delete('mfc_layout');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}

  const pages={
    gestor:{test:()=>!!document.getElementById('app')&&!!document.querySelector('.side-nav'),items:[
      ['GESTOR-GERAL-01','#app','Estrutura geral do gestor'],['GESTOR-MENU-01','.sidebar','Menu lateral'],['GESTOR-NAVEGACAO-01','.side-nav','Botões de navegação'],
      ['GESTOR-LISTA-01','#list-col','Coluna de visitas e filtros'],['GESTOR-CARDS-01','#clist','Lista de cartões de visitas'],['GESTOR-DETALHE-01','.detail-col','Coluna principal de detalhes'],
      ['GESTOR-VISITA-01','#view-detail','Detalhes da visita selecionada'],['GESTOR-CABECALHO-01','#view-detail .detail-head','Cabeçalho da visita'],['GESTOR-CLIENTE-01','#view-detail .igrid','Grade de dados do cliente'],
      ['GESTOR-BLOCO-01','#view-detail .iblk','Bloco individual de informação'],['GESTOR-LOCALIZACAO-01','#view-detail [data-location-view]','Mapa exato ou aproximado do atendimento'],['GESTOR-RELATORIO-01','#view-detail .vcard','Relatório/atendimento'],['GESTOR-SECAO-01','#view-detail .box','Seção interna do atendimento'],
      ['GESTOR-FINANCEIRO-01','#view-fin','Tela Financeiro'],['GESTOR-CADASTROS-01','#view-leads','Tela Novos Cadastros'],['GESTOR-CADASTROS-LISTA-01','#leads-list','Lista de novos cadastros'],
      ['GESTOR-LIXEIRA-01','#view-trash','Tela Lixeira'],['GESTOR-LIXEIRA-LISTA-01','#trash-list','Lista da lixeira'],['GESTOR-MODAL-VISITA-01','#newvisit-modal .modal','Modal Nova visita'],
      ['GESTOR-MODAL-EMPRESA-01','#company-modal .modal','Modal Visita Empresa'],['GESTOR-MODAL-GARANTIA-01','#warranty-modal .modal','Modal Garantia'],['GESTOR-MODAL-EDITAR-01','#edit-modal .modal','Modal Editar cliente'],['GESTOR-MODAL-EDITAR-MAPA-01','#e-location-map','Mapa para corrigir o alfinete'],
      ['GESTOR-MODAL-RELATORIO-01','#etr-modal .etr-box','Modal Editar relatório do técnico'],['GESTOR-MODAL-EQUIPAMENTO-01','#equipment-report-modal .modal','Novo relatório por equipamento'],['GESTOR-MODAL-RESUMO-01','#client-summary-modal .modal','Resumo do cliente pesquisado']
    ]},
    index:{test:()=>!!document.getElementById('detail')&&!!document.getElementById('d-body'),items:[
      ['INDEX-CABECALHO-01','body > header','Cabeçalho do técnico'],['INDEX-BUSCA-01','.search-wrap','Busca de visitas'],['INDEX-LISTA-01','.list-wrap','Lista de visitas'],['INDEX-CARD-01','.list-wrap .card','Cartão de visita'],
      ['INDEX-DETALHE-01','#detail','Tela de detalhes'],['INDEX-DETALHE-CABECALHO-01','.detail-header','Cabeçalho dos detalhes'],['INDEX-DETALHE-CONTEUDO-01','#d-body','Conteúdo dos detalhes'],
      ['INDEX-CLIENTE-01','#d-body .client-compact','Dados do cliente'],['INDEX-CLIENTE-BLOCO-01','#d-body .client-row','Bloco individual do cliente'],['INDEX-LOCALIZACAO-01','#d-body [data-location-view]','Mapa exato ou aproximado do atendimento'],['INDEX-ABAS-01','#d-body .v-tabs-wrap','Abas de relatórios'],
      ['INDEX-RELATORIO-01','#d-body .v-panel.active','Relatório atualmente aberto'],['INDEX-GARANTIA-ESCOLHA-01','#d-body .warranty-mode-grid','Escolha do atendimento de garantia'],
      ['INDEX-GARANTIA-HISTORICO-01','#d-body .warranty-history','Histórico da garantia'],['INDEX-SECAO-01','#d-body .box','Seção de informação/formulário'],['INDEX-AVALIACAO-01','#d-body .acc','Avaliação enviada'],
      ['INDEX-FOTOS-01','#d-body .photo-area','Área de fotos'],['INDEX-MODAL-EQUIPAMENTO-01','#equipment-report-modal .modal','Novo relatório por equipamento'],['INDEX-MODAL-EDITAR-01','#edit-report-modal .modal','Modal Editar relatório'],['INDEX-MODAL-DESCARTAR-01','#discard-modal .modal','Modal Descartar visita']
    ]},
    cadastro:{test:()=>!!document.getElementById('form-container'),items:[
      ['CADASTRO-TIPO-01','#type-overlay .type-box','Escolha Cliente ou Empresa'],['CADASTRO-GERAL-01','#form-container','Página do cadastro'],['CADASTRO-CAPA-01','.hero','Capa e apresentação'],
      ['CADASTRO-BENEFICIOS-01','.benefits','Benefícios exibidos'],['CADASTRO-BLOQUEIO-01','#blocked-box','Aviso de link expirado'],['CADASTRO-CLIENTE-01','#lead-form-cliente','Formulário de cliente'],
      ['CADASTRO-CLIENTE-CAMPO-01','#lead-form-cliente .card','Bloco de campo do cliente'],['CADASTRO-CLIENTE-EQUIPAMENTOS-01','#f-equipment-list','Lista de equipamentos'],['CADASTRO-CLIENTE-LOCALIZACAO-01','#lead-form-cliente [data-location-block]','Confirmação da localização do cliente'],['CADASTRO-CLIENTE-MAPA-01','#location-map-cliente','Mapa para conferir ou ajustar o cliente'],['CADASTRO-CLIENTE-ENVIAR-01','#btn-submit-cliente','Botão Finalizar cadastro do cliente'],
      ['CADASTRO-EMPRESA-01','#lead-form-empresa','Formulário de empresa'],['CADASTRO-EMPRESA-EQUIPAMENTOS-01','#e-equipment-list','Lista de equipamentos'],['CADASTRO-EMPRESA-CAMPO-01','#lead-form-empresa .card','Bloco de campo da empresa'],['CADASTRO-EMPRESA-LOCALIZACAO-01','#lead-form-empresa [data-location-block]','Confirmação da localização da empresa'],['CADASTRO-EMPRESA-MAPA-01','#location-map-empresa','Mapa para conferir ou ajustar a empresa'],
      ['CADASTRO-EMPRESA-ENVIAR-01','#btn-submit-empresa','Botão Finalizar cadastro da empresa'],['CADASTRO-RODAPE-01','.footer-brand','Rodapé do cadastro']
    ]}
  };
  const page=Object.entries(pages).find(([,value])=>value.test());
  if(!page)return;
  const [pageName,config]=page;
  const permanent=pageName==='gestor'||pageName==='index';
  if(!permanent&&localStorage.getItem(OWNER_KEY)!=='1')return;
  document.body.classList.add('mfc-layout-'+pageName);
  let active=localStorage.getItem(ACTIVE_KEY)==='1';
  let scheduled=false;
  let observer=null;
  const desktopPointer=matchMedia('(hover: hover) and (pointer: fine)');
  const available=()=>pageName!=='index'||desktopPointer.matches;

  const style=document.createElement('style');
  style.textContent=`
    #mfc-layout-toggle{position:fixed;right:22px;bottom:22px;z-index:2147483647;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid #60a5fa;background:#0f172a;color:#fff;border-radius:999px;padding:0 15px;font:800 12px/1.1 Arial,sans-serif;box-shadow:0 8px 28px #0009;cursor:pointer}
    #mfc-layout-toggle.active{background:#14532d;border-color:#4ade80;color:#dcfce7}
    body.mfc-layout-gestor #mfc-layout-toggle{position:static;right:auto;bottom:auto;z-index:auto;width:100%;min-height:42px;flex:0 0 auto;margin-top:auto;border-radius:12px;padding:0 12px;font-size:17px}
    body.mfc-layout-gestor #conn{margin-top:0}
    body.mfc-layout-index #mfc-layout-toggle{display:none}
    #mfc-layout-panel{position:fixed;left:10px;bottom:10px;z-index:2147483646;max-width:calc(100vw - 155px);background:#020617ee;color:#fff;border:1px solid #60a5fa;border-radius:10px;padding:8px 10px;font:700 11px/1.35 Arial,sans-serif;box-shadow:0 8px 28px #0009;display:none}
    body.mfc-layout-active #mfc-layout-panel{display:block}
    body.mfc-layout-active [data-mfc-layout-code]{outline:2px dashed #facc15!important;outline-offset:-2px!important}
    .mfc-layout-tag{position:fixed;z-index:2147483645;border:0;border-radius:4px;background:#facc15;color:#111827;padding:3px 5px;font:900 9px/1 Arial,sans-serif;letter-spacing:.02em;box-shadow:0 2px 7px #0008;cursor:copy;white-space:nowrap;max-width:190px;overflow:hidden;text-overflow:ellipsis}
    .mfc-layout-tag:hover{background:#fff;color:#000;transform:scale(1.04)}
    @media(hover:hover) and (pointer:fine){body.mfc-layout-index #mfc-layout-toggle{display:flex}}
    @media(max-width:900px){body.mfc-layout-gestor #mfc-layout-toggle{width:42px;height:42px;min-height:42px;margin-top:0;padding:0;flex-basis:42px}body.mfc-layout-gestor #mfc-layout-toggle span{display:none}}
  `;
  document.head.appendChild(style);
  const toggle=document.createElement('button');toggle.id='mfc-layout-toggle';toggle.type='button';if(pageName==='gestor'){const sidebar=document.querySelector('.sidebar'),conn=document.getElementById('conn');sidebar.insertBefore(toggle,conn)}else document.body.appendChild(toggle);
  const panel=document.createElement('div');panel.id='mfc-layout-panel';panel.innerHTML=`Mapa visual: <b>${pageName.toUpperCase()}</b><br>Clique numa etiqueta para copiar o código.`;document.body.appendChild(panel);

  function visible(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth}
  function clear(){document.querySelectorAll('.mfc-layout-tag').forEach(el=>el.remove());document.querySelectorAll('[data-mfc-layout-code]').forEach(el=>{delete el.dataset.mfcLayoutCode;delete el.dataset.mfcLayoutLabel})}
  function observe(){observer?.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']})}
  function assign(){observer?.disconnect();clear();if(active&&available()){config.items.forEach(([base,selector,label])=>{const found=[...document.querySelectorAll(selector)];found.forEach((el,index)=>{const code=found.length>1?`${base}.${String(index+1).padStart(2,'0')}`:base;el.dataset.mfcLayoutCode=code;el.dataset.mfcLayoutLabel=label})});renderTags()}observe()}
  function renderTags(){document.querySelectorAll('.mfc-layout-tag').forEach(el=>el.remove());if(!active||!available())return;document.querySelectorAll('[data-mfc-layout-code]').forEach(el=>{if(!visible(el))return;const r=el.getBoundingClientRect();const tag=document.createElement('button');tag.type='button';tag.className='mfc-layout-tag';tag.textContent=el.dataset.mfcLayoutCode;tag.title=`${el.dataset.mfcLayoutCode} — ${el.dataset.mfcLayoutLabel}`;tag.style.left=Math.max(2,r.left+2)+'px';tag.style.top=Math.max(2,r.top+2)+'px';tag.onclick=async event=>{event.preventDefault();event.stopPropagation();const text=el.dataset.mfcLayoutCode;try{await navigator.clipboard.writeText(text);panel.innerHTML=`Copiado: <b>${text}</b><br>${el.dataset.mfcLayoutLabel}`}catch{panel.innerHTML=`Código: <b>${text}</b><br>${el.dataset.mfcLayoutLabel}`}};document.body.appendChild(tag)})}
  function scheduleAssign(){if(scheduled||!active||!available())return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;assign()})}
  function scheduleRender(){if(scheduled||!active||!available())return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderTags()})}
  function setActive(value){active=!!value;localStorage.setItem(ACTIVE_KEY,active?'1':'0');const enabled=active&&available();document.body.classList.toggle('mfc-layout-active',enabled);toggle.classList.toggle('active',enabled);toggle.innerHTML='<i class="fa-solid fa-code" aria-hidden="true"></i><span>Mapa visual</span>';toggle.title=enabled?'Desativar mapa visual':'Ativar mapa visual';toggle.setAttribute('aria-label',toggle.title);toggle.setAttribute('aria-pressed',enabled?'true':'false');assign()}
  toggle.onclick=()=>setActive(!active);
  addEventListener('keydown',event=>{if(event.ctrlKey&&event.shiftKey&&event.key.toLowerCase()==='l'){event.preventDefault();setActive(!active)}});
  addEventListener('scroll',scheduleRender,true);addEventListener('resize',scheduleRender);
  desktopPointer.addEventListener?.('change',()=>setActive(active));
  observer=new MutationObserver(scheduleAssign);observe();
  setActive(active);
})();
