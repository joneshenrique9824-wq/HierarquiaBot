import express from "express";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

const ROLE_RESP = process.env.ROLE_RESP;
const ROLE_AUXRESP = process.env.ROLE_AUXRESP;
const ROLE_DIR = process.env.ROLE_DIR;
const ROLE_VD = process.env.ROLE_VD;
const ROLE_SUP = process.env.ROLE_SUP;
const ROLE_COD = process.env.ROLE_COD;
const ROLE_MED = process.env.ROLE_MED;
const ROLE_ENF = process.env.ROLE_ENF;
const ROLE_PARM = process.env.ROLE_PARM;

// ================= DEBUG =================
console.log("🔐 TOKEN EXISTE?", !!TOKEN);
console.log("📏 TAMANHO TOKEN:", TOKEN?.length);

// ================= BLOQUEIO SE TOKEN ERRADO =================
if (!TOKEN || TOKEN.length < 50) {
  console.error("❌ TOKEN INVÁLIDO OU NÃO CONFIGURADO");
  process.exit(1);
}

// ================= WEB =================
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000, () => console.log("🌐 Web server ativo"));

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================= BANCO =================
const banco = {
  RESP: [],
  AUXRESP: [],
  DIR: [],
  VD: [],
  SUP: [],
  COD: [],
  MED: [],
  ENF: [],
  PARM: []
};

// ================= CARGOS =================
const CARGOS = [
  { nome: "👑 RESPONSÁVEL DO HP", role: ROLE_RESP, key: "RESP" },
  { nome: "🩺 AUX. RESPONSÁVEL DO HP", role: ROLE_AUXRESP, key: "AUXRESP" },
  { nome: "🏛️ DIRETORIA", role: ROLE_DIR, key: "DIR" },
  { nome: "📌 VICE DIRETORIA", role: ROLE_VD, key: "VD" },
  { nome: "🔱 SUPERVISÃO", role: ROLE_SUP, key: "SUP" },
  { nome: "📊 COORDENAÇÃO", role: ROLE_COD, key: "COD" },
  { nome: "💉 MÉDICOS", role: ROLE_MED, key: "MED" },
  { nome: "🩹 ENFERMEIROS", role: ROLE_ENF, key: "ENF" },
  { nome: "🚑 PARAMÉDICOS", role: ROLE_PARM, key: "PARM" }
];

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Criar painel de cargos"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar pessoa ao cargo")
    .addStringOption(o =>
      o.setName("cargo").setRequired(true))
    .addUserOption(o =>
      o.setName("pessoa").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover pessoa do cargo")
    .addStringOption(o =>
      o.setName("cargo").setRequired(true))
    .addUserOption(o =>
      o.setName("pessoa").setRequired(true))

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ================= GERAR =================
async function gerarHierarquia(guild) {
  await guild.members.fetch();

  let texto = "";

  for (const c of CARGOS) {
    const membrosRole = guild.members.cache.filter(m =>
      c.role && m.roles.cache.has(c.role)
    );

    const manual = banco[c.key].map(id => `<@${id}>`);

    const lista = [
      ...new Set([
        ...membrosRole.map(m => `<@${m.id}>`),
        ...manual
      ])
    ];

    texto += `\n${c.nome}\n`;
    texto += lista.length
      ? lista.map(x => `• ${x}`).join("\n")
      : "(vazio)";
    texto += "\n";
  }

  return texto;
}

// ================= EMBED =================
async function criarEmbed(guild) {
  const texto = await gerarHierarquia(guild);

  return new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🏥 QUADRO DE CARGOS - HOSPITAL")
    .setDescription(`\`\`\`\n${texto}\n\`\`\``)
    .setTimestamp();
}

// ================= ENVIAR =================
async function enviarPainel(guild) {
  const canal = guild.channels.cache.get(CHANNEL_ID);
  if (!canal) return console.log("❌ Canal não encontrado");

  const embed = await criarEmbed(guild);

  await canal.send({
    embeds: [embed],
    allowedMentions: { parse: [] }
  });
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`🔥 Logado como ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados");
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "painel") {
    await enviarPainel(i.guild);
    return i.reply({ content: "✅ Painel criado", ephemeral: true });
  }

  if (i.commandName === "addcargo") {
    const cargo = i.options.getString("cargo").toUpperCase();
    const user = i.options.getUser("pessoa");

    if (!banco[cargo]) {
      return i.reply({ content: "❌ Cargo inválido", ephemeral: true });
    }

    if (!banco[cargo].includes(user.id)) {
      banco[cargo].push(user.id);
    }

    return i.reply({ content: "✅ Adicionado", ephemeral: true });
  }

  if (i.commandName === "removercargo") {
    const cargo = i.options.getString("cargo").toUpperCase();
    const user = i.options.getUser("pessoa");

    banco[cargo] = banco[cargo].filter(id => id !== user.id);
    return i.reply({ content: "✅ Removido", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
