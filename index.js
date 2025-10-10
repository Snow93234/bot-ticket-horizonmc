require('dotenv').config();
const token = process.env.TOKEN;
('dotenvconst {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// 📌 IDs importantes
const STAFF_ROLE_ID = "1415388649020850257"; // cargo staff
const LOG_CHANNEL_ID = "1407081682183393335"; // canal de logs de avaliação

client.once("ready", () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);
});

// 📌 Painel de abertura de ticket
client.on("messageCreate", async (message) => {
  if (message.content === "!painel") {
    const embed = new EmbedBuilder()
      .setTitle("📋 │ SUPORTE - HorizonMC")
      .setDescription(
        "Para agilizar o atendimento, selecione a **categoria** que melhor corresponde à sua solicitação e envie o máximo de informações possíveis.\n\n" +
        "➤ :small_blue_diamond: **Importante:** quanto mais detalhes você fornecer (prints, descrições, horários aproximados, etc.), mais rápido poderemos entender e resolver seu problema.\n\n" +
        "➤ :hourglass_flowing_sand: **Seja paciente!** Os tickets são atendidos por ordem de chegada. O prazo máximo de resposta é de até **2 dias úteis**."
      )
      .setColor("Orange")
      .setImage("https://media.discordapp.net/attachments/1407081682707943595/1415102569369309285/image.png")
      .setThumbnail("https://media.discordapp.net/attachments/1407081682707943595/1415102545772281926/image.png");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("menu_ticket")
      .setPlaceholder("Escolha uma categoria.")
      .addOptions(
        {
          label: "Dúvidas!",
          description: "Tire suas dúvidas sobre o servidor.",
          value: "duvida",
          emoji: "❓"
        },
        {
          label: "Reportar Erros!",
          description: "Reporte algum erro ou problema técnico.",
          value: "erro",
          emoji: "🚨"
        },
        {
          label: "Financeiro!",
          description: "Compra de kits, vips e unban.",
          value: "financeiro",
          emoji: "💰"
        },
        {
          label: "Outro Motivo!",
          description: "Clique aqui para ser atendido.",
          value: "outro",
          emoji: "📌"
        }
      );

    const row = new ActionRowBuilder().addComponents(menu);
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// 📌 Interações
client.on("interactionCreate", async (interaction) => {
  // Criar ticket
  if (interaction.isStringSelectMenu() && interaction.customId === "menu_ticket") {
    await interaction.deferReply({ ephemeral: true });

    const tipo = interaction.values[0];
    const existente = interaction.guild.channels.cache.find(
      (c) => c.topic && c.topic.includes(`Dono: ${interaction.user.id}`)
    );

    if (existente) {
      return interaction.editReply({
        content: `⚠️ Você já possui um ticket aberto em ${existente}.`
      });
    }

    const canal = await interaction.guild.channels.create({
      name: `ticket-${tipo}-${interaction.user.username}`,
      type: 0,
      topic: `Dono: ${interaction.user.id} | Atendido por: Ninguém ainda`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: STAFF_ROLE_ID,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ]
    });

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fechar_ticket")
        .setLabel("Fechar Ticket")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("resgatar_ticket")
        .setLabel("Resgatar Ticket")
        .setEmoji("📌")
        .setStyle(ButtonStyle.Secondary)
    );

    await canal.send({
      content: `🎫 Olá ${interaction.user}, você abriu um ticket de **${tipo.toUpperCase()}**.\nExplique seu problema com detalhes.`,
      components: [botoes]
    });

    await interaction.editReply({ content: `✅ Ticket criado com sucesso em ${canal}` });
  }

  // Resgatar ticket
  if (interaction.isButton() && interaction.customId === "resgatar_ticket") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ Apenas membros da staff podem resgatar tickets!",
        ephemeral: true
      });
    }

    const dono = interaction.channel.topic?.match(/Dono: (\d+)/)?.[1];
    if (!dono) return;

    if (interaction.channel.topic.includes("Atendido por:") && !interaction.channel.topic.includes("Ninguém ainda")) {
      return interaction.reply({
        content: "⚠️ Esse ticket já foi resgatado por outro staff!",
        ephemeral: true
      });
    }

    await interaction.channel.setTopic(`Dono: ${dono} | Atendido por: ${interaction.user.id}`);

    await interaction.reply({
      content: `📌 Ticket agora está sendo atendido por ${interaction.user}!`
    });
  }

  // Fechar ticket
  if (interaction.isButton() && interaction.customId === "fechar_ticket") {
    const dono = interaction.channel.topic?.match(/Dono: (\d+)/)?.[1];
    const staff = interaction.channel.topic?.match(/Atendido por: (\d+)/)?.[1];

    const member = dono ? await interaction.guild.members.fetch(dono).catch(() => null) : null;

    await interaction.channel.delete();

    if (member) {
      try {
        const embed = new EmbedBuilder()
          .setTitle("⭐ Avaliação do Atendimento - HorizonMC")
          .setDescription("Por favor, avalie o atendimento do seu ticket escolhendo uma nota de **1 a 5 estrelas**:")
          .setColor("Orange");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rate_1_${staff}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_2_${staff}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_3_${staff}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_4_${staff}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_5_${staff}`).setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary)
        );

        await member.send({ embeds: [embed], components: [row] });
      } catch {
        console.log("❌ Não consegui enviar DM de avaliação.");
      }
    }
  }

  // Avaliação
  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
    const [_, nota, staffId] = interaction.customId.split("_");

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("📊 Nova Avaliação Recebida")
        .setDescription(`⭐ Nota: **${nota}**\n👤 Staff: <@${staffId}>\n🙍 Usuário: ${interaction.user}`)
        .setColor("Green");

      await logChannel.send({ embeds: [embed] });
    }

    await interaction.reply({
      content: "✅ Obrigado por avaliar o atendimento!",
      ephemeral: true
    });
  }
});

// 🚀 Login do bot
client.login(process.env.TOKEN);
