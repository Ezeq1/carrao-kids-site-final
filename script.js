// ===== Helpers de DOM e Storage =====
const $ = id => document.getElementById(id);
const storage = window.localStorage;

// ===== Sistema de Abas =====
function show(abaId) {
  document.querySelectorAll('.aba').forEach(el => el.classList.remove('ativa'));
  $(abaId).classList.add('ativa');
}
function setupNav(role) {
  const nav = $('navBar');
  nav.innerHTML = '';
  // Admin não tem aba pessoal de escalas
  const tabs = role === 'Admin'
    ? ['controle','escalasGerais','relatorios','relatoriosGerais']
    : ['escalas','relatorios'];
  tabs.push('logout');
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.textContent = tab === 'logout' ? 'Sair' : ({
      controle:'Controle',
      escalas:'Minhas Escalas',
      escalasGerais:'Escala Geral',
      relatorios:'Meu Relatório',
      relatoriosGerais:'Relatório Geral'
    })[tab];
    btn.className = tab === 'logout' ? 'logout' : '';
    btn.addEventListener('click', () => {
      if (tab === 'logout') {
        $('app').style.display = 'none';
        show('login');
      } else show(tab);
    });
    nav.appendChild(btn);
  });
}

// ===== Cadastro =====
$('formCadastroLogin').addEventListener('submit', e => {
  e.preventDefault();
  const vol = {
    nome: $('cadNome').value.trim(),
    turma: $('cadTurma').value,
    funcao: $('cadFuncao').value,
    contato: $('cadContato').value.trim(),
    domingos: +$('cadDomingos').value,
    nascimento: $('cadNascimento').value,
    senha: $('cadSenha').value
  };
  const users = JSON.parse(storage.getItem('voluntarios')||'[]');
  if (users.find(u => u.nome === vol.nome)) {
    return alert('Já existe voluntário com esse nome.');
  }
  users.push(vol);
  storage.setItem('voluntarios', JSON.stringify(users));
  alert('Cadastrado com sucesso! Faça login.');
  $('linkParaLogin').click();
});

// ===== Login + 2FA Simples =====
$('formLogin').addEventListener('submit', e => {
  e.preventDefault();
  const nome = $('loginNome').value.trim();
  const senha = $('loginSenha').value;
  const code = $('code2FA').value;
  const users = JSON.parse(storage.getItem('voluntarios')||'[]');
  const user = users.find(u => u.nome === nome && u.senha === senha);
  if (!user) return alert('Usuário ou senha inválidos.');
  if (code !== '123456') return alert('Código 2FA incorreto.');
  window.currentUser = user;
  $('login').style.display = 'none';
  $('app').style.display = 'block';
  const role = user.nome === 'Admin' ? 'Admin' : 'User';
  setupNav(role);
  if (role === 'Admin') {
    renderControle();
    renderEscalaGeral();
  } else {
    renderEscalasPessoais(user.nome);
  }
  renderRelatorios(user.nome);
});

// ===== Controle de Voluntários (Admin) =====
function renderControle() {
  const tbody = $('tblVols').querySelector('tbody');
  const users = JSON.parse(storage.getItem('voluntarios')||'[]');
  tbody.innerHTML = '';
  users.forEach((u,i) => {
    const tr = document.createElement('tr');
    ['nome','turma','funcao','contato'].forEach(prop => {
      const td = document.createElement('td');
      td.textContent = u[prop];
      tr.appendChild(td);
    });
    // reset senha
    const tdR = document.createElement('td');
    const btnR = document.createElement('button');
    btnR.textContent = '🔄';
    btnR.className = 'btn-sm reset';
    btnR.addEventListener('click', () => {
      u.senha = '1234';
      storage.setItem('voluntarios', JSON.stringify(users));
      alert(`Senha de ${u.nome} resetada para 1234`);
      renderControle();
    });
    tdR.appendChild(btnR);
    tr.appendChild(tdR);
    // remover
    const tdD = document.createElement('td');
    const btnD = document.createElement('button');
    btnD.textContent = '❌';
    btnD.className = 'btn-sm remove';
    btnD.addEventListener('click', () => {
      users.splice(i,1);
      storage.setItem('voluntarios', JSON.stringify(users));
      renderControle();
    });
    tdD.appendChild(btnD);
    tr.appendChild(tdD);
    tbody.appendChild(tr);
  });
}

// ===== Escalas Pessoais (Voluntário) =====
function getDomingosDoMesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const domingos = [];
  const ultimoDia = new Date(ano, mes+1, 0).getDate();
  for (let d = 1; d <= ultimoDia; d++) {
    const dt = new Date(ano, mes, d);
    if (dt.getDay() === 0) domingos.push(dt);
  }
  return domingos;
}

function renderEscalasPessoais(nome) {
  const container = $('listaEscalas');
  container.innerHTML = '';
  const domingos = getDomingosDoMesAtual();
  const confs  = JSON.parse(storage.getItem('conf_'+nome)   || '{}');
  const swaps  = JSON.parse(storage.getItem('swapRequests') || '{}');

  domingos.forEach(dt => {
    const id = dt.toISOString().split('T')[0];
    const row = document.createElement('div');
    row.className = 'escala-item';
    const lbl = document.createElement('label');
    lbl.textContent = `Domingo – ${dt.toLocaleDateString('pt-BR')}`;
    row.appendChild(lbl);

    if (confs[id]) {
      const btn = document.createElement('button');
      btn.textContent = 'Confirmado ✅';
      btn.className = 'btn-confirmado';
      btn.disabled = true;
      row.appendChild(btn);

    } else if (swaps[id] && swaps[id].includes(nome)) {
      const btn = document.createElement('button');
      btn.textContent = 'Troca Solicitada 🔄';
      btn.className = 'btn-sm';
      btn.disabled = true;
      row.appendChild(btn);

    } else {
      const btnC = document.createElement('button');
      btnC.textContent = 'Confirmar';
      btnC.className = 'btn-login';
      btnC.addEventListener('click', () => {
        confs[id] = true;
        storage.setItem('conf_'+nome, JSON.stringify(confs));
        renderEscalasPessoais(nome);
      });
      row.appendChild(btnC);

      const btnS = document.createElement('button');
      btnS.textContent = 'Solicitar Troca';
      btnS.className = 'btn-troca';
      btnS.addEventListener('click', () => {
        swaps[id] = swaps[id] || [];
        swaps[id].push(nome);
        storage.setItem('swapRequests', JSON.stringify(swaps));
        renderEscalasPessoais(nome);
      });
      row.appendChild(btnS);
    }

    container.appendChild(row);
  });
}

// ===== Botão Google Calendar =====
$('btnAddCalendar').addEventListener('click', () => {
  function getNextSunday(){
    const t = new Date(), wd = t.getUTCDay(), dd = (7 - wd) % 7;
    const ns = new Date(t);
    ns.setUTCDate(t.getUTCDate() + dd);
    ns.setUTCHours(22,0,0);
    return ns;
  }
  function fmt(d){
    return d.toISOString()
            .replace(/-|:|\\.\\d{3}/g,'')
            .slice(0,15) + 'Z';
  }
  const start = fmt(getNextSunday());
  const end   = fmt(new Date(new Date(start).getTime()+3600000));
  const title   = encodeURIComponent('Ministério Carrão Kids - 19h00');
  const details = encodeURIComponent('Todo domingo às 19h, voluntariado Carrão Kids.');
  const location= encodeURIComponent('Igreja Presbiteriana Carrão');
  const recur   = encodeURIComponent('RRULE:FREQ=WEEKLY;BYDAY=SU');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE\
&text=${title}&dates=${start}/${end}\
&details=${details}&location=${location}\
&recur=${recur}&sf=true&output=xml`;
  window.open(url,'_blank');
});

// ===== Escala Geral (Admin) =====
function renderEscalaGeral(){
  const container = $('listaEscalasGerais');
  container.innerHTML = '';
  const users = JSON.parse(storage.getItem('voluntarios')||'[]');
  const domingos = getDomingosDoMesAtual();
  const swaps = JSON.parse(storage.getItem('swapRequests')||'{}');

  domingos.forEach(dt => {
    const id = dt.toISOString().split('T')[0];
    const card = document.createElement('div');
    card.className = 'escala-card';
    const h3 = document.createElement('h3');
    h3.textContent = dt.toLocaleDateString('pt-BR');
    card.appendChild(h3);

    users.forEach(u => {
      const item = document.createElement('div');
      item.className = 'vol-item';
      item.textContent = `${u.nome} (${u.funcao})`;
      // Se houve pedido de troca, mostra botão de aprovar
      if (swaps[id] && swaps[id].includes(u.nome)) {
        const btnA = document.createElement('button');
        btnA.textContent = 'Aprovar Troca';
        btnA.className = 'btn-confirmar';
        btnA.addEventListener('click', () => {
          swaps[id] = swaps[id].filter(n => n !== u.nome);
          storage.setItem('swapRequests', JSON.stringify(swaps));
          renderEscalaGeral();
        });
        item.appendChild(btnA);
      }
      card.appendChild(item);
    });

    // Lista pendências de troca
    if (swaps[id] && swaps[id].length) {
      const p = document.createElement('p');
      p.textContent = 'Pedidos de Troca: ' + swaps[id].join(', ');
      card.appendChild(p);
    }

    container.appendChild(card);
  });
}

// ===== Relatórios =====
function renderRelatorios(nome){
  const confs = JSON.parse(storage.getItem('conf_'+nome)||'{}');
  const total = Object.values(confs).filter(v=>v).length;
  $('relatorioResultado').textContent =
    `Você confirmou ${total} domingos neste mês.`;

  const sel = $('selTurmaRel');
  sel.innerHTML = '<option value="">Selecione turma</option>';
  ['Kids I','Kids II'].forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
  sel.onchange = () => {
    const turma = sel.value;
    const list = JSON.parse(storage.getItem('voluntarios')||'[]')
      .filter(u => u.turma===turma);
    $('relatorioTurma').innerHTML = list.length
      ? list.map(u=>`<p>${u.nome} – ${u.funcao}</p>`).join('')
      : '<p>Nenhum voluntário nesta turma.</p>';
  };
}
