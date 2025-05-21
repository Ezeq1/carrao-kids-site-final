<script>
// — Cria admin padrão se não existir —
let vs = JSON.parse(localStorage.getItem('voluntarios') || '[]');
if (!vs.find(u => u.role === 'Admin')) {
  vs.push({ nome: 'admin', senha: 'admin', turma: '-', funcao: 'Admin', role: 'Admin' });
  localStorage.setItem('voluntarios', JSON.stringify(vs));
}

// — Helpers de DOM —
const navBar = document.getElementById('navBar'),
      loginSec = document.getElementById('login'),
      appDiv   = document.getElementById('app');
const sections = id => document.getElementById(id);
function show(id) {
  document.querySelectorAll('.aba').forEach(s => s.classList.remove('ativa'));
  sections(id).classList.add('ativa');
  if (id === 'controle') montarControle();
  if (id === 'escalas') montarEscalas();
  if (id === 'escalasGerais') montarEscalasGerais();
  if (id === 'relatorios') montarRelatorio();
  if (id === 'relatoriosGerais') montarRelatorioGerais();
}

// — Login/Cadastro UI toggle —
document.getElementById('linkParaCadastro').onclick = e => {
  e.preventDefault();
  formLogin.style.display = 'none'; formCadastroLogin.style.display = 'block';
};
document.getElementById('linkParaLogin').onclick = e => {
  e.preventDefault();
  formCadastroLogin.style.display = 'none'; formLogin.style.display = 'block';
};

// — Cadastro —
formCadastroLogin.onsubmit = e => {
  e.preventDefault();
  const nome = cadNome.value.trim(),
        turma = cadTurma.value,
        func = cadFuncao.value,
        contato = cadContato.value.trim(),
        dom = parseInt(cadDomingos.value),
        nasc = cadNascimento.value,
        sen = cadSenha.value;
  if (!nome || !turma || !func || !contato || !dom || !nasc || !sen) {
    return alert('Preencha todos os campos!');
  }
  let vs = JSON.parse(localStorage.getItem('voluntarios') || '[]');
  if (vs.some(v => v.nome.toLowerCase() === nome.toLowerCase())) {
    return alert('Nome já cadastrado!');
  }
  vs.push({ nome, turma, funcao: func, contato, domingos: dom, nascimento: nasc, senha: sen, role: 'User' });
  localStorage.setItem('voluntarios', JSON.stringify(vs));
  alert('Cadastro OK! Faça login.');
  formCadastroLogin.reset();
  formCadastroLogin.style.display = 'none';
  formLogin.style.display = 'block';
};
// — Login —
formLogin.onsubmit = e => {
  e.preventDefault();
  const nome = loginNome.value.trim(),
        senha = loginSenha.value;
  const vs = JSON.parse(localStorage.getItem('voluntarios') || '[]');
  const user = vs.find(v => v.nome.toLowerCase() === nome.toLowerCase() && v.senha === senha);
  if (!user) return alert('Credenciais inválidas!');
  localStorage.setItem('usuarioLogado', JSON.stringify(user));
  iniciarSistema(user);
};

function iniciarSistema(user) {
  loginSec.style.display = 'none';
  appDiv.style.display = 'block';
  navBar.style.display = 'flex';
  document.getElementById('nomeUsuario').textContent = user.nome;
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = user.role === 'Admin' ? 'inline-block' : 'none';
  });
  show('escalas');
}

// — Logout —
function sair() {
  localStorage.removeItem('usuarioLogado');
  location.reload();
}

// — Montar Escalas (página inicial) —
function montarEscalas() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  const escalas = JSON.parse(localStorage.getItem('escalas') || '[]');
  const hoje = new Date();
  const futuros = escalas.filter(e => new Date(e.data) >= hoje);
  const minhaEscala = futuros.filter(e =>
    e.voluntarios.some(v => v.nome === user.nome && v.turma === user.turma)
  );
  const div = document.getElementById('listaEscalas');
  div.innerHTML = '';
  if (!minhaEscala.length) return div.innerHTML = '<p>Você não está escalado(a) nos próximos domingos.</p>';
  minhaEscala.forEach(esc => {
    const data = new Date(esc.data).toLocaleDateString();
    const turma = esc.voluntarios.find(v => v.nome === user.nome).turma;
    const funcao = esc.voluntarios.find(v => v.nome === user.nome).funcao;
    div.innerHTML += `
      <div class="escala">
        <strong>${data}</strong> - Turma: ${turma} - Função: ${funcao}<br>
        <button onclick="confirmarPresenca('${esc.data}')">Confirmar Presença</button>
        <button onclick="solicitarTroca('${esc.data}', '${turma}', '${funcao}')">Solicitar Troca</button>
      </div>`;
  });
}
// — Confirmar presença —
function confirmarPresenca(data) {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  const escalas = JSON.parse(localStorage.getItem('escalas') || '[]');
  const escala = escalas.find(e => e.data === data);
  if (!escala) return alert('Escala não encontrada.');

  const voluntario = escala.voluntarios.find(v => v.nome === user.nome);
  if (!voluntario) return alert('Você não está nessa escala.');

  if (voluntario.confirmado) return alert('Você já confirmou presença.');

  voluntario.confirmado = true;
  salvarEscalas(escalas);
  alert('Presença confirmada!');
  montarEscalas();
}

// — Solicitar troca —
function solicitarTroca(data, turma, funcao) {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  const escalas = JSON.parse(localStorage.getItem('escalas') || '[]');
  const escala = escalas.find(e => e.data === data);
  const voluntarios = escala.voluntarios.filter(v =>
    v.turma === turma && v.funcao === funcao && v.nome !== user.nome
  );

  if (!voluntarios.length) return alert('Nenhum voluntário disponível para troca.');

  const escolhido = prompt(`Solicitar troca com:\n${voluntarios.map(v => v.nome).join('\n')}`);
  if (!escolhido || !voluntarios.some(v => v.nome === escolhido)) return alert('Nome inválido.');

  const alvo = voluntarios.find(v => v.nome === escolhido);
  const meuRegistro = escala.voluntarios.find(v => v.nome === user.nome);
  [alvo.nome, meuRegistro.nome] = [meuRegistro.nome, alvo.nome];

  registrarTroca(user.nome, alvo.nome, data);
  salvarEscalas(escalas);
  alert(`Troca realizada com ${alvo.nome}!`);
  montarEscalas();
}

// — Registrar troca no relatório —
function registrarTroca(origem, destino, data) {
  const rel = JSON.parse(localStorage.getItem('relatorios') || '{}');
  rel[origem] = rel[origem] || { fez: 0, trocou: 0, pegou: 0 };
  rel[destino] = rel[destino] || { fez: 0, trocou: 0, pegou: 0 };
  rel[origem].trocou++;
  rel[destino].pegou++;
  localStorage.setItem('relatorios', JSON.stringify(rel));
}

// — Relatório individual —
function verRelatorioPessoal() {
  const user = JSON.parse(localStorage.getItem('usuarioLogado'));
  const rel = JSON.parse(localStorage.getItem('relatorios') || '{}')[user.nome] || { fez: 0, trocou: 0, pegou: 0 };
  alert(`Relatório de ${user.nome}:\n\nParticipou: ${rel.fez}\nTrocou: ${rel.trocou}\nAssumiu: ${rel.pegou}`);
}

// — Relatório geral (admin) —
function verRelatorioGeral() {
  const rel = JSON.parse(localStorage.getItem('relatorios') || '{}');
  let texto = 'Relatório Geral:\n\n';
  for (const nome in rel) {
    const { fez, trocou, pegou } = rel[nome];
    texto += `${nome} - Participou: ${fez}, Trocou: ${trocou}, Assumiu: ${pegou}\n`;
  }
  alert(texto);
}

// — Atualiza contagem de escalas feitas —
function atualizarParticipacoes() {
  const escalas = JSON.parse(localStorage.getItem('escalas') || '[]');
  const rel = JSON.parse(localStorage.getItem('relatorios') || '{}');
  escalas.forEach(e => {
    e.voluntarios.forEach(v => {
      if (v.confirmado) {
        rel[v.nome] = rel[v.nome] || { fez: 0, trocou: 0, pegou: 0 };
        rel[v.nome].fez++;
      }
    });
  });
  localStorage.setItem('relatorios', JSON.stringify(rel));
}

// — Salvar escalas no localStorage —
function salvarEscalas(escalas) {
  localStorage.setItem('escalas', JSON.stringify(escalas));
}
