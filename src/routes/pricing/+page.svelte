<script lang="ts">
    export let data;

    let stripeInfo = data.stripeInfo;
</script>

<h1>Pricing</h1>
<h2>Status: {stripeInfo.paymentStatus}</h2>
{#if stripeInfo.paymentStatus != "active" }
<form action="?/subscribe" method="POST">
    <input type="hidden" name="priceId" value="price_1NcaZaAal153k9FegJLVegmt" />
    <button type="submit">Subscribe</button>
</form>
<form action="?/adopt" method="POST">
    <input type="hidden" name="priceId" value="price_1NcaZaAal153k9FegJLVegmt" />
    <button type="submit">Adopt</button>
</form>
{/if}
{#if stripeInfo.customerId }
<form action="?/dashboard" method="POST">
    <button type="submit">Dashboard</button>
</form>
{/if}
