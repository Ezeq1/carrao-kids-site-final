// — Cria admin padrão se não existir —
let vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
if (!vs.find(u=>u.role==='Admin')) {
  vs.push({ nome:'admin', senha:'admin', turma:'-', funcao:'Admin', role:'Admin' });
  localStorage.setItem('voluntarios', JSON.stringify(vs));
}

// — Helpers de DOM —
const navBar = document.getElementById('navBar'),
      loginSec = document.getElementById('login'),
      appDiv   = document.getElementById('app');
const sections = id=>document.getElementById(id);
function show(id){
  document.querySelectorAll('.aba').forEach(s=>s.classList.remove('ativa'));
  sections(id).classList.add('ativa');
  // disparadores
  if (id==='controle') montarControle();
  if (id==='escalas') montarEscalas();
  if (id==='escalasGerais') montarEscalasGerais();
  if (id==='relatorios') montarRelatorio();
  if (id==='relatoriosGerais') montarRelatorioGerais();
}

// — Login/Cadastro UI toggle —
document.getElementById('linkParaCadastro').onclick = e=>{
  e.preventDefault();
  formLogin.style.display='none'; formCadastroLogin.style.display='block';
};
document.getElementById('linkParaLogin').onclick = e=>{
  e.preventDefault();
  formCadastroLogin.style.display='none'; formLogin.style.display='block';
};

// — Cadastro —
formCadastroLogin.onsubmit = e=>{
  e.preventDefault();
  const nome= cadNome.value.trim(),
        turma= cadTurma.value,
        func= cadFuncao.value,
        contato= cadContato.value.trim(),
        dom= parseInt(cadDomingos.value),
        nasc= cadNascimento.value,
        sen= cadSenha.value;
  if(!nome||!turma||!func||!contato||!dom||!nasc||!sen){
    return alert('Preencha todos os campos!');
  }
  let vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
  if(vs.some(v=>v.nome.toLowerCase()===nome.toLowerCase())){
    return alert('Nome já cadastrado!');
  }
  vs.push({ nome,turma,funcao:func,contato,domingos:dom,nascimento:nasc,senha:sen,role:'User' });
  localStorage.setItem('voluntarios',JSON.stringify(vs));
  alert('Cadastro OK! Faça login.');
  formCadastroLogin.reset();
  formCadastroLogin.style.display='none';
  formLogin.style.display='block';
};

// — Login —
formLogin.onsubmit = e=>{
  e.preventDefault();
  const nome= loginNome.value.trim(), sen= loginSenha.value;
  vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
  const u = vs.find(v=>v.nome===nome&&v.senha===sen);
  if(!u){ alert('Credenciais inválidas'); return; }
  sessionStorage.setItem('currentUser',JSON.stringify(u));
  loginSec.style.display='none'; appDiv.style.display='block';
  buildNav(u.role);
  show(u.role==='Admin'?'controle':'escalas');
};

// — Logout —
function logout(){
  sessionStorage.removeItem('currentUser');
  appDiv.style.display='none'; loginSec.style.display='block';
}

// — Monta Nav Dinâmica —
function buildNav(role){
  navBar.innerHTML = '';
  function btn(txt,sec,cls=''){ return `<button class="${cls}" onclick="show('${sec}')">${txt}</button>`; }
  if(role==='Admin'){
    navBar.innerHTML += btn('Controle','controle')+
                        btn('Escala Geral','escalasGerais')+
                        btn('Relatórios Gerais','relatoriosGerais');
  } else {
    navBar.innerHTML += btn('Minhas Escalas','escalas')+
                        btn('Meu Relatório','relatorios');
  }
  navBar.innerHTML += btn('Sair','','logout','logout')  
                   .replace('onclick="show', 'onclick="logout');
}

// — Cálculo de Domingos do mês corrente —
function domingosDoMes(){
  const hoje = new Date(), arr = [];
  const ano = hoje.getFullYear(), mes = hoje.getMonth();
  const d = new Date(ano, mes, 1);
  while (d.getMonth() === mes) {
    if (d.getDay() === 0) arr.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return arr;
}

// — Formatação de data —
function fmt(d){ return d.toISOString().split('T')[0]; }
function fmtExt(d){ return d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}); }
function corStatus(s){ return {confirmado:'green',trocado:'red',assumido:'blue'}[s]||'gray'; }

// — Montar Escalas Pessoais —
function montarEscalas(){
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  let escAll = JSON.parse(localStorage.getItem('escalas')||'{}');
  // garante que cada domingo tem entrada
  domingosDoMes().forEach(d=>{
    const ds = fmt(d);
    if (!escAll[ds]) {
      const vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
      escAll[ds] = vs.map(v=>({
        nome:v.nome,funcao:v.funcao,turma:v.turma,
        status:'pendente',parceiro:null
      }));
    }
  });
  localStorage.setItem('escalas',JSON.stringify(escAll));

  listaEscalas.innerHTML = '';
  domingosDoMes().forEach(d=>{
    const ds = fmt(d), arr = escAll[ds];
    const v = arr.find(x=>x.nome===user.nome);
    if (!v) return;
    const color = corStatus(v.status);
    listaEscalas.innerHTML += `
      <div class="escala-card">
        <h3>${fmtExt(d)}</h3>
        <div class="vol-item" style="border-left:5px solid ${color};">
          <strong>${v.nome}</strong> (${v.funcao} - ${v.turma})<br>
          <span style="color:${color};font-weight:600;">Status: ${v.status}</span><br>
          ${v.parceiro?`Troca c/ <b>${v.parceiro}</b><br>`:''}
          <button onclick="confirmarPresenca('${ds}')" class="btn-confirmar" ${v.status!=='pendente'?'disabled':''}>
            Confirmar
          </button>
          <button onclick="trocaUI('${ds}')" class="btn-troca">Trocar</button>
          <div id="troca-${ds}" class="troca-area"></div>
        </div>
      </div>`;
  });
}
function confirmarPresenca(ds){
  let esc = JSON.parse(localStorage.getItem('escalas'));
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const v = esc[ds].find(x=>x.nome===user.nome);
  if (v) v.status='confirmado';
  localStorage.setItem('escalas',JSON.stringify(esc));
  montarEscalas();
}
function trocaUI(ds){
  document.querySelectorAll('.troca-area').forEach(a=>a.innerHTML='');
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  let arr = JSON.parse(localStorage.getItem('escalas'))[ds];
  const orig = arr.find(x=>x.nome===user.nome);
  const opts = JSON.parse(localStorage.getItem('voluntarios'))
    .filter(v=>v.funcao===orig.funcao && v.nome!==orig.nome);
  const area = document.getElementById(`troca-${ds}`);
  if (!opts.length) return area.innerHTML=`<p>Nenhum disponível</p>`;
  let sel = `<select id="sel-${ds}"><option></option>`;
  opts.forEach(o=> sel+=`<option>${o.nome}</option>`);
  sel+=`</select><button onclick="confirmarTroca('${ds}')" class="btn-transfer">OK</button>`;
  area.innerHTML = sel;
}
function confirmarTroca(ds){
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  let esc = JSON.parse(localStorage.getItem('escalas'));
  const arr = esc[ds];
  const orig = arr.find(x=>x.nome===user.nome);
  const dest = arr.find(x=>x.nome===document.getElementById(`sel-${ds}`).value);
  if(orig.funcao!==dest.funcao){ alert('Só mesma função'); return; }
  orig.status='trocado'; orig.parceiro=dest.nome;
  dest.status='assumido'; dest.parceiro=orig.nome;
  localStorage.setItem('escalas',JSON.stringify(esc));
  montarEscalas();
}

// — Montar Escalas Gerais (Admin) —
function montarEscalasGerais(){
  const esc = JSON.parse(localStorage.getItem('escalas')||'{}');
  listaEscalasGerais.innerHTML = '';
  Object.entries(esc).forEach(([ds,arr])=>{
    const d = new Date(ds);
    let card = `<div class="escala-card"><h3>${fmtExt(d)}</h3>`;
    arr.forEach(e=>{
      const c = corStatus(e.status);
      card+=`
        <div class="vol-item" style="border-left:5px solid ${c};">
          ${e.nome} (${e.funcao}-${e.turma}) — <span style="color:${c};">${e.status}</span><br>
          <button class="btn-clear btn-sm" onclick="limparStatus('${ds}','${e.nome}')">Limpar</button>
          <button class="btn-transfer btn-sm" onclick="transferirPara('${ds}','${e.nome}')">Transferir</button>
        </div>`;
    });
    card+='</div>';
    listaEscalasGerais.innerHTML += card;
  });
}
function limparStatus(ds,nome){
  const esc = JSON.parse(localStorage.getItem('escalas')||'{}');
  const e = esc[ds].find(x=>x.nome===nome);
  if(e){ e.status='pendente'; e.parceiro=null; }
  localStorage.setItem('escalas',JSON.stringify(esc));
  montarEscalasGerais();
}
function transferirPara(ds,nome){
  const nova = prompt('Nova data (YYYY-MM-DD):');
  if(!nova||!/^\d{4}-\d{2}-\d{2}$/.test(nova)) return alert('Formato inválido');
  const esc = JSON.parse(localStorage.getItem('escalas'));
  const arr = esc[ds];
  const idx = arr.findIndex(x=>x.nome===nome);
  const [entry] = arr.splice(idx,1);
  if(!esc[nova]) esc[nova]=[];
  esc[nova].push({...entry,status:'pendente',parceiro:null});
  localStorage.setItem('escalas',JSON.stringify(esc));
  montarEscalasGerais();
}

// — Relatório Pessoal —
function montarRelatorio(){
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const esc = JSON.parse(localStorage.getItem('escalas')||'{}');
  let tot=0,c=0,t=0,a=0;
  Object.values(esc).forEach(arr=>arr.forEach(v=>{
    if(v.nome===user.nome){
      tot++; if(v.status==='confirmado')c++;
      if(v.status==='trocado')t++; if(v.status==='assumido')a++;
    }
  }));
  relatorioResultado.innerHTML=
    `<h3>${user.nome}</h3>
     <p>Total: ${tot}</p>
     <div class="barra-relatorio"><div class="barra confirm" style="width:${pct(c,tot)}%">C:${c}</div></div>
     <div class="barra-relatorio"><div class="barra troc" style="width:${pct(t,tot)}%">T:${t}</div></div>
     <div class="barra-relatorio"><div class="barra assm" style="width:${pct(a,tot)}%">A:${a}</div></div>`;
}
function pct(x,tot){return tot?Math.round(x/tot*100)+'%':'0%';}

// — Relatórios Gerais (Admin) —
function montarRelatorioGerais(){
  const sel = document.getElementById('selTurmaRel');
  sel.innerHTML = `<option value="">Todas</option><option>Kids I</option><option>Kids II</option>`;
  sel.onchange = ()=>renderRelTurma(sel.value);
  renderRelTurma('');
}
function renderRelTurma(turma){
  const esc = JSON.parse(localStorage.getItem('escalas')||'{}');
  let text = '';
  Object.values(esc).forEach(arr=>
    arr.filter(v=>!turma||v.turma===turma)
       .forEach(v=> text+=`${v.nome} (${v.funcao}-${v.turma}): ${v.status}\n`)
  );
  relatorioTurma.innerHTML = `<pre>${text}</pre>`;
}

// — Controle de Voluntários (Admin) —
function montarControle(){
  const vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
  const tbody = tblVols.querySelector('tbody'); tbody.innerHTML='';
  vs.forEach(v=>{
    tbody.innerHTML+=`
      <tr>
        <td>${v.nome}</td><td>${v.turma}</td><td>${v.funcao}</td><td>${v.contato}</td>
        <td><button class="btn-sm btn-reset" onclick="resetSenha('${v.nome}')">Reset Senha</button></td>
        <td><button class="btn-sm btn-remove" onclick="removerVol('${v.nome}')">Remover</button></td>
      </tr>`;
  });
}
function resetSenha(nome){
  if(!confirm(`Resetar senha de ${nome}?`))return;
  let vs = JSON.parse(localStorage.getItem('voluntarios'));
  vs = vs.map(v=>v.nome===nome?{...v,senha:'1234'}:v);
  localStorage.setItem('voluntarios',JSON.stringify(vs));
  montarControle();
}
function removerVol(nome){
  if(!confirm(`Remover ${nome}?`))return;
  let vs = JSON.parse(localStorage.getItem('voluntarios')||'[]');
  vs = vs.filter(v=>v.nome!==nome);
  localStorage.setItem('voluntarios',JSON.stringify(vs));
  const esc = JSON.parse(localStorage.getItem('escalas')||'{}');
  Object.keys(esc).forEach(ds=>esc[ds]=esc[ds].filter(e=>e.nome!==nome));
  localStorage.setItem('escalas',JSON.stringify(esc));
  montarControle(); montarEscalasGerais();
}

// — Inicialização —
logout();
montarRelatorioGerais();
