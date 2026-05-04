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

// ================= WEB =================
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000);

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
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
  { nome: "👑 RESPONSÁVEL DO HP", key: "RESP" },
  { nome: "🩺 AUX. RESPONSÁVEL DO HP", key: "AUXRESP" },
  { nome: "🏛️ DIRETORIA", key: "DIR" },
  { nome: "📌 VICE DIRETORIA", key: "VD" },
  { nome: "🔱 SUPERVISÃO", key: "SUP" },
  { nome: "📊 COORDENAÇÃO", key: "COD" },
  { nome: "💉 MÉDICOS", key: "MED" },
  { nome: "🩹 ENFERMEIROS", key: "ENF" },
  { nome: "🚑 PARAMÉDICOS", key: "PARM" }
];

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Criar painel"),

  new SlashCommandBuilder()
    .setName("addcargo")
    .setDescription("Adicionar pessoa")
    .addStringOption(o =>
      o.setName("cargo").setRequired(true))
    .addStringOption(o =>
      o.setName("nome").setDescription("Nome + tag").setRequired(true)),

  new SlashCommandBuilder()
    .setName("removercargo")
    .setDescription("Remover pessoa")
    .addStringOption(o =>
      o.setName("cargo").setRequired(true))
    .addStringOption(o =>
      o.setName("nome").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// ================= GERAR =================
function gerar() {
  let texto = "";

  for (const c of CARGOS) {
    const lista = banco[c.key];

    texto += `\n${c.nome}\n`;
    texto += lista.length
      ? lista.map(x => `• ${x}`).join("\n")
      : "(vazio)";
    texto += "\n";
  }

  return texto;
}

// ================= EMBED =================
function criarEmbed() {
  const texto = gerar();

  return new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🏥 QUADRO DE CARGOS - HOSPITAL")
    .setDescription(`\`\`\`\n${texto}\n\`\`\``)
    .setTimestamp();
}

// ================= ENVIAR =================
async function enviarPainel(guild) {
  const canal = guild.channels.cache.get(CHANNEL_ID);
  if (!canal) return;

  const embed = criarEmbed();

  await canal.send({ embeds: [embed] });
}

// ================= READY =================
client.once("clientReady", async () => {
  console.log(`🔥 ${client.user.tag} online`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
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
    const nome = i.options.getString("nome");

    if (!banco[cargo]) {
      return i.reply({ content: "❌ Cargo inválido", ephemeral: true });
    }

    banco[cargo].push(nome);
    return i.reply({ content: "✅ Adicionado", ephemeral: true });
  }

  if (i.commandName === "removercargo") {
    const cargo = i.options.getString("cargo").toUpperCase();
    const nome = i.options.getString("nome");

    banco[cargo] = banco[cargo].filter(x => x !== nome);
    return i.reply({ content: "✅ Removido", ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(TOKEN);
