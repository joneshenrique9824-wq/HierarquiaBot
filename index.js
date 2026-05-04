import "dotenv/config";
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
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CHANNEL_ID,
  ROLE_RESP,
  ROLE_AUXRESP,
  ROLE_DIR,
  ROLE_VD,
  ROLE_SUP,
  ROLE_COD,
  ROLE_MED,
  ROLE_ENF,
  ROLE_PARM
} = process.env;

// ================= WEB (RAILWAY KEEP ALIVE) =================
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000, () => console.log("🌐 Web ligado"));

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================= BANCO (MEMÓRIA) =================
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
      o.setName("cargo").setDescription("Ex: SUP").setRequired(true))
    .addUserOption(o =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover pessoa do cargo")
    .addStringOption(o =>
      o.setName("cargo").setDescription("Ex: SUP").setRequired(true))
    .addUserOption(o =>
      o.setName("pessoa").setDescription("Usuário").setRequired(true))

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ================= GERAR TEXTO =================
async function gerarHierarquia(guild) {
  await guild.members.fetch();

  let texto = "";

  for (const c of CARGOS) {

    const membrosRole = guild.members.cache.filter(m =>
      c.role && m.roles.cache.has(c.role)
    );

    const membrosManual = banco[c.key].map(id => `<@${id}>`);

    const listaFinal = [
      ...new Set([
        ...membrosRole.map(m => `<@${m.id}>`),
        ...membrosManual
      ])
    ];

    texto += `\n${c.nome}\n`;
    texto += listaFinal.length
      ? listaFinal.map(x => `• ${x}`).join("\n")
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

  // PAINEL
  if (i.commandName === "painel") {
    await enviarPainel(i.guild);
    return i.reply({ content: "✅ Painel criado", ephemeral: true });
  }

  // ADD
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

  // REMOVE
  if (i.commandName === "removercargo") {
    const cargo = i.options.getString("cargo").toUpperCase();
    const user = i.options.getUser("pessoa");

    if (!banco[cargo]) {
      return i.reply({ content: "❌ Cargo inválido", ephemeral: true });
    }

    banco[cargo] = banco[cargo].filter(id => id !== user.id);

    return i.reply({ content: "✅ Removido", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
