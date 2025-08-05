// Update to Influencers.tsx - Add click handler for trading
// Add this to your existing Influencers.tsx file

const handleInfluencerClick = (influencerId: number) => {
  if (influencerId === 1) {
    // Only Rohan (id: 1) is clickable for now
    navigate(`/coin/${influencerId}`);
  } else {
    // Show coming soon message for others
    alert('This influencer will be available soon!');
  }
};

// Update the Card component in your map to include onClick:
<Card 
  key={influencer.id} 
  className={`relative bg-card/80 border-border hover:border-primary/50 transition-all duration-300 group hover:shadow-lg ${influencer.id === 1 ? 'cursor-pointer' : 'cursor-default'}`}
  onClick={() => handleInfluencerClick(influencer.id)}
>
  {/* ... existing card content ... */}
  
  {/* Update the button to reflect availability */}
  <Button 
    className={`w-full ${influencer.id === 1 
      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
      : 'bg-muted hover:bg-muted/80 text-muted-foreground cursor-not-allowed'
    } text-sm py-2`}
    disabled={influencer.id !== 1}
    onClick={(e) => {
      e.stopPropagation(); // Prevent card click
      handleInfluencerClick(influencer.id);
    }}
  >
    {influencer.id === 1 ? (
      <>
        <TrendingUp className="w-4 h-4 mr-2" />
        Start Trading
      </>
    ) : (
      <>
        <Clock className="w-4 h-4 mr-2" />
        Coming Soon
      </>
    )}
  </Button>
</Card>