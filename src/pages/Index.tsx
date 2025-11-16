import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Scan, Leaf, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface DefectAnalysis {
  crop_type: string;
  defects: Array<{
    name: string;
    description: string;
    affected_area: string;
  }>;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence_score: number;
  recommendations: string;
}

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DefectAnalysis | null>(null);
  const { toast } = useToast();

  const { data: history, refetch } = useQuery({
    queryKey: ["crop-detections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crop_detections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-crop-defects", {
        body: { image: selectedImage },
      });

      if (error) throw error;

      setAnalysis(data);

      // Save to database
      await supabase.from("crop_detections").insert({
        crop_type: data.crop_type,
        defects: data.defects,
        severity: data.severity,
        confidence_score: data.confidence_score,
      });

      refetch();

      toast({
        title: "Analysis Complete",
        description: `Detected ${data.crop_type} with ${data.severity.toLowerCase()} severity defects`,
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low":
        return "bg-chart-5 text-white";
      case "Medium":
        return "bg-chart-4 text-white";
      case "High":
        return "bg-secondary text-secondary-foreground";
      case "Critical":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "Low":
        return <CheckCircle2 className="h-5 w-5" />;
      case "Medium":
        return <AlertTriangle className="h-5 w-5" />;
      case "High":
      case "Critical":
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="bg-gradient-primary rounded-full p-4 shadow-elevated">
              <Leaf className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            CropGuard AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered crop defect detection for Wheat, Rice, Corn, Tomato, and Potato
          </p>
        </div>

        <Tabs defaultValue="detect" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="detect" className="text-lg">
              <Scan className="h-5 w-5 mr-2" />
              Detect Defects
            </TabsTrigger>
            <TabsTrigger value="history" className="text-lg">
              <Leaf className="h-5 w-5 mr-2" />
              Detection History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detect" className="space-y-6">
            {/* Upload Area */}
            <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Crop Image
                </CardTitle>
                <CardDescription>
                  Drag and drop or click to upload an image of your crop (max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative"
                >
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-64 cursor-pointer bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Selected crop"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">
                          Drop your crop image here
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          or click to browse
                        </p>
                      </div>
                    )}
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedImage && (
                  <div className="mt-6 flex gap-4">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex-1 bg-gradient-primary hover:opacity-90 text-lg py-6"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Scan className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-2 h-5 w-5" />
                          Analyze Crop
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedImage(null);
                        setAnalysis(null);
                      }}
                      variant="outline"
                      size="lg"
                      className="text-lg py-6"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysis && (
              <Card className="shadow-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Analysis Results</CardTitle>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {analysis.confidence_score.toFixed(1)}% Confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Crop Type & Severity */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-gradient-primary text-primary-foreground">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Leaf className="h-8 w-8" />
                          <div>
                            <p className="text-sm opacity-90">Crop Type</p>
                            <p className="text-2xl font-bold">{analysis.crop_type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={getSeverityColor(analysis.severity)}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          {getSeverityIcon(analysis.severity)}
                          <div>
                            <p className="text-sm opacity-90">Severity Level</p>
                            <p className="text-2xl font-bold">{analysis.severity}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detected Defects */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Detected Defects
                    </h3>
                    <div className="space-y-3">
                      {analysis.defects.map((defect, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-lg">{defect.name}</h4>
                              <Badge variant="secondary">{defect.affected_area}</Badge>
                            </div>
                            <p className="text-muted-foreground">{defect.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Treatment Recommendations
                      </h3>
                      <p className="text-foreground leading-relaxed">{analysis.recommendations}</p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Recent Detections</CardTitle>
                <CardDescription>
                  View your recent crop defect detection history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!history || history.length === 0 ? (
                  <div className="text-center py-12">
                    <Leaf className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">
                      No detections yet. Upload an image to get started!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item) => (
                      <Card key={item.id} className="bg-muted/30">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-xl font-semibold mb-1">{item.crop_type}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getSeverityColor(item.severity)}>
                                {item.severity}
                              </Badge>
                              <Badge variant="outline">
                                {item.confidence_score.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {Array.isArray(item.defects) ? item.defects.length : 0} defect(s) detected
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
